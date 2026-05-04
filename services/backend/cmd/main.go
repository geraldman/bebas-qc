package main

import (
	"log"
	"os"

	appdb "github.com/geraldman/bebas-qc/backend/db"
	"github.com/geraldman/bebas-qc/backend/mqtt"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

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

	// Start HTTP API
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Recent sensor readings per machine
	r.GET("/readings/:machine_id", func(c *gin.Context) {
		machineID := c.Param("machine_id")
		readings, err := appdb.GetRecentReadings(database, machineID, 50)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, readings)
	})

	port := os.Getenv("BACKEND_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("HTTP server starting on port %s", port)
	r.Run(":" + port)
}
