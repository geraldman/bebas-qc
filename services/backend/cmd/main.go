package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
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
)

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

func main() {
	// Load .env in development
	godotenv.Load()

	// Connect to PostgreSQL
	database, err := appdb.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()
	log.Println("Connected to PostgreSQL")

	// Start MQTT processor (non-blocking, runs in background)
	processor := mqtt.NewProcessor(database)
	go processor.Start()

	cache := newRedisClient()

	// Start HTTP API
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
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

	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("HTTP server starting on port %s", port)
	r.Run(":" + port)
}
