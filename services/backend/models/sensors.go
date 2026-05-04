package models

import "time"

type SensorPayload struct {
	MachineID   string  `json:"machine_id"`
	MachineType string  `json:"machine_type"`
	Temperature float64 `json:"temperature"`
	Humidity    float64 `json:"humidity"`
	Vibration   float64 `json:"vibration"`
	BeltSpeed   float64 `json:"belt_speed"`
	DefectCount int     `json:"defect_count"`
	Fault       *string `json:"fault"`
	Timestamp   string  `json:"timestamp"`
	Cycle       int     `json:"cycle"`
}

type SensorReading struct {
	ID          int       `db:"id"`
	MachineID   string    `db:"machine_id"`
	MachineType string    `db:"machine_type"`
	Temperature float64   `db:"temperature"`
	Humidity    float64   `db:"humidity"`
	Vibration   float64   `db:"vibration"`
	BeltSpeed   float64   `db:"belt_speed"`
	DefectCount int       `db:"defect_count"`
	Fault       *string   `db:"fault"`
	CreatedAt   time.Time `db:"created_at"`
}

type RCAResult struct {
	ID        int       `db:"id"`
	MachineID string    `db:"machine_id"`
	Problem   string    `db:"problem"`
	Cause     string    `db:"cause"`
	Evidence  string    `db:"evidence"`
	Action    string    `db:"action"`
	Severity  string    `db:"severity"`
	CreatedAt time.Time `db:"created_at"`
}
