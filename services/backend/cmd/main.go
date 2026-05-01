package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/geraldman/bebas-qc/backend/internal/config"
)

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	// Set the content type to JSON
	w.Header().Set("Content-Type", "application/json")
	
	// Create a simple status map
	response := map[string]string{"status": "UP"}

	// Set status code to 200 OK
	w.WriteHeader(http.StatusOK)

	// Encode and send the response
	json.NewEncoder(w).Encode(response)
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %s", err)
	}

	if cfg.UseSupabase {
		log.Println("Database provider: supabase")
	} else {
		log.Println("Database provider: postgres")
	}

	// Register the handler for the /health route
	http.HandleFunc("/", healthCheckHandler)

	fmt.Println("Server starting on :8080...")
	
	// Start the server
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("Server failed: %s\n", err)
	}
}