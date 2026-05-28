package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func Connect() (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"),
		os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_USER"),
		os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)

	var db *sqlx.DB
	var err error
	for i := 1; i <= 15; i++ {
		db, err = sqlx.Connect("postgres", dsn)
		if err == nil {
			return db, nil
		}
		log.Printf("[DB] Failed to connect (attempt %d/15): %v. Retrying in 2s...", i, err)
		time.Sleep(2 * time.Second)
	}

	return nil, err
}
