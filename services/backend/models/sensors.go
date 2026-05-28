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
	ID          int       `db:"id" json:"id"`
	MachineID   string    `db:"machine_id" json:"machine_id"`
	MachineType string    `db:"machine_type" json:"machine_type"`
	Temperature float64   `db:"temperature" json:"temperature"`
	Humidity    float64   `db:"humidity" json:"humidity"`
	Vibration   float64   `db:"vibration" json:"vibration"`
	BeltSpeed   float64   `db:"belt_speed" json:"belt_speed"`
	DefectCount int       `db:"defect_count" json:"defect_count"`
	Fault       *string   `db:"fault" json:"fault"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

type RCAResult struct {
	ID        int       `db:"id" json:"id"`
	MachineID string    `db:"machine_id" json:"machine_id"`
	Problem   string    `db:"problem" json:"problem"`
	Cause     string    `db:"cause" json:"cause"`
	Evidence  string    `db:"evidence" json:"evidence"`
	Action    string    `db:"action" json:"action"`
	Severity  string    `db:"severity" json:"severity"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}
