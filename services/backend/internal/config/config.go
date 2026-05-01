package config

import (
	"fmt"
	"os"
	"strconv"
)

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type SupabaseConfig struct {
	URL            string
	AnonKey        string
	ServiceRoleKey string
}

type Config struct {
	UseSupabase bool
	Postgres    PostgresConfig
	Supabase    SupabaseConfig
}

func Load() (Config, error) {
	useSupabase, err := parseBoolEnv("USE_SUPABASE", false)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		UseSupabase: useSupabase,
		Postgres: PostgresConfig{
			Host:     os.Getenv("DB_HOST"),
			Port:     os.Getenv("DB_PORT"),
			User:     os.Getenv("DB_USER"),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     os.Getenv("DB_NAME"),
		},
		Supabase: SupabaseConfig{
			URL:            os.Getenv("SUPABASE_URL"),
			AnonKey:        os.Getenv("SUPABASE_ANON_KEY"),
			ServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		},
	}

	return cfg, nil
}

func parseBoolEnv(key string, defaultValue bool) (bool, error) {
	raw := os.Getenv(key)
	if raw == "" {
		return defaultValue, nil
	}

	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("invalid %s: %w", key, err)
	}

	return value, nil
}
