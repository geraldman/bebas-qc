package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	appdb "github.com/geraldman/bebas-qc/backend/db"
	"github.com/geraldman/bebas-qc/backend/mqtt"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

const (
	defaultReadingsLimit = 50
	readingsCacheTTL     = 10 * time.Second
	defaultRoboflowURL   = "https://serverless.roboflow.com/geralds-workspace-ce3fe/workflows/detect-and-classify"
)

type roboflowRequest struct {
	ImageURL string `json:"image_url"`
}

type roboflowPayload struct {
	APIKey string `json:"api_key"`
	Inputs struct {
		Image struct {
			Type  string `json:"type"`
			Value string `json:"value"`
		} `json:"image"`
	} `json:"inputs"`
}

func newRedisClient() *redis.Client {
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "redis"
	}
	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	client := redis.NewClient(&redis.Options{Addr: fmt.Sprintf("%s:%s", host, port)})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Redis not available (%v), caching disabled", err)
		_ = client.Close()
		return nil
	}

	return client
}

func pickImageDir(candidates []string) string {
	for _, dir := range candidates {
		if dir == "" {
			continue
		}
		info, err := os.Stat(dir)
		if err == nil && info.IsDir() {
			return dir
		}
	}
	if len(candidates) > 0 && candidates[0] != "" {
		return candidates[0]
	}
	return "./assets/roboflow"
}

func main() {
	// Load .env in development
	godotenv.Load()
	rand.Seed(time.Now().UnixNano())

	// Connect to PostgreSQL
	database, err := appdb.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()
	log.Println("Connected to PostgreSQL")

	// Background cleanup for expired telegram subscriptions (>15 minutes old)
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			res, err := database.Exec("DELETE FROM telegram_subscriptions WHERE created_at < NOW() - INTERVAL '15 minutes'")
			if err != nil {
				log.Printf("[CLEANUP] Failed to clear expired telegram subscriptions: %v", err)
			} else if rows, err := res.RowsAffected(); err == nil && rows > 0 {
				log.Printf("[CLEANUP] Cleaned up %d expired telegram subscriptions", rows)
			}
		}
	}()

	// Start MQTT processor (non-blocking, runs in background)
	processor := mqtt.NewProcessor(database)
	go processor.Start()

	cache := newRedisClient()

	// Start HTTP API
	r := gin.Default()

	imageDir := os.Getenv("ROBOFLOW_IMAGE_DIR")
	if imageDir == "" {
		imageDir = pickImageDir([]string{"./assets/roboflow", "../../assets/roboflow"})
	}
	r.Static("/assets/roboflow", imageDir)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Recent sensor readings per machine
	r.GET("/readings/:machine_id", func(c *gin.Context) {
		machineID := c.Param("machine_id")
		cacheKey := fmt.Sprintf("readings:%s:%d", machineID, defaultReadingsLimit)
		if cache != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
			defer cancel()
			if cached, err := cache.Get(ctx, cacheKey).Result(); err == nil {
				c.Header("X-Cache", "HIT")
				c.Data(200, "application/json", []byte(cached))
				return
			}
		}

		readings, err := appdb.GetRecentReadings(database, machineID, defaultReadingsLimit)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		payload, err := json.Marshal(readings)
		if err != nil {
			c.JSON(200, readings)
			return
		}

		if cache != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
			defer cancel()
			_ = cache.Set(ctx, cacheKey, payload, readingsCacheTTL).Err()
			c.Header("X-Cache", "MISS")
		}

		c.Data(200, "application/json", payload)
	})

	r.POST("/api/vision/roboflow", func(c *gin.Context) {
		var req roboflowRequest
		if err := c.ShouldBindJSON(&req); err != nil || req.ImageURL == "" {
			c.JSON(400, gin.H{"error": "image_url is required"})
			return
		}

		apiKey := os.Getenv("ROBOFLOW_API_KEY")
		if apiKey == "" {
			c.JSON(500, gin.H{"error": "ROBOFLOW_API_KEY is not configured"})
			return
		}

		workflowURL := os.Getenv("ROBOFLOW_WORKFLOW_URL")
		if workflowURL == "" {
			workflowURL = defaultRoboflowURL
		}

		var payload roboflowPayload
		payload.APIKey = apiKey

		var base64Data string
		var readLocalErr error

		// Parse the image URL
		parsedURL, err := url.Parse(req.ImageURL)
		var urlPath string
		if err == nil {
			urlPath = parsedURL.Path
		} else {
			urlPath = req.ImageURL
		}

		// Check if it's a local assets path
		if idx := strings.Index(urlPath, "/assets/roboflow/"); idx != -1 {
			relPath := urlPath[idx+len("/assets/roboflow/"):]
			cleanedRelPath := filepath.Clean(relPath)
			// Avoid directory traversal out of the assets/roboflow folder
			if !strings.HasPrefix(cleanedRelPath, "..") && cleanedRelPath != "." {
				localPath := filepath.Join(imageDir, cleanedRelPath)
				imgBytes, err := os.ReadFile(localPath)
				if err == nil {
					base64Data = base64.StdEncoding.EncodeToString(imgBytes)
				} else {
					readLocalErr = err
				}
			}
		} else if strings.HasPrefix(req.ImageURL, "data:") {
			// If it's already a base64 data URL
			parts := strings.SplitN(req.ImageURL, ";base64,", 2)
			if len(parts) == 2 {
				base64Data = parts[1]
			}
		}

		if base64Data != "" {
			payload.Inputs.Image.Type = "base64"
			payload.Inputs.Image.Value = base64Data
		} else {
			if readLocalErr != nil {
				log.Printf("Failed to read local image %s: %v", req.ImageURL, readLocalErr)
				c.JSON(500, gin.H{"error": fmt.Sprintf("failed to read local image: %v", readLocalErr)})
				return
			}
			// Fallback to URL type if we couldn't read a local file or if it's an external URL
			payload.Inputs.Image.Type = "url"
			payload.Inputs.Image.Value = req.ImageURL
		}

		body, err := json.Marshal(payload)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to encode request"})
			return
		}

		client := http.Client{Timeout: 15 * time.Second}
		resp, err := client.Post(workflowURL, "application/json", bytes.NewReader(body))
		if err != nil {
			c.JSON(502, gin.H{"error": "roboflow request failed"})
			return
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(502, gin.H{"error": "failed to read roboflow response"})
			return
		}

		c.Data(resp.StatusCode, "application/json", respBody)
	})

	r.GET("/api/vision/frame", func(c *gin.Context) {
		status := c.DefaultQuery("status", "ok")
		if status != "ok" && status != "defect" {
			c.JSON(400, gin.H{"error": "status must be ok or defect"})
			return
		}

		folder := filepath.Join(imageDir, status)
		entries, err := os.ReadDir(folder)
		if err != nil {
			c.JSON(404, gin.H{"error": "image folder not found"})
			return
		}

		files := make([]string, 0, len(entries))
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			ext := strings.ToLower(filepath.Ext(entry.Name()))
			switch ext {
			case ".png", ".jpg", ".jpeg", ".webp":
				files = append(files, entry.Name())
			}
		}

		if len(files) == 0 {
			c.JSON(404, gin.H{"error": "no images found"})
			return
		}

		picked := files[rand.Intn(len(files))]
		c.JSON(200, gin.H{
			"image_url": fmt.Sprintf("/assets/roboflow/%s/%s", status, picked),
			"status":    status,
			"count":     len(files),
		})
	})

	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("HTTP server starting on port %s", port)
	r.Run(":" + port)
}
