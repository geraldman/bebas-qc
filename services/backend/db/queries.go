package db

import (
	"github.com/geraldman/bebas-qc/backend/models"
	"github.com/jmoiron/sqlx"
)

func SaveSensorReading(db *sqlx.DB, p models.SensorPayload) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO sensor_readings
			(machine_id, machine_type, temperature, humidity, vibration, belt_speed, defect_count, fault)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id`,
		p.MachineID, p.MachineType, p.Temperature, p.Humidity,
		p.Vibration, p.BeltSpeed, p.DefectCount, p.Fault,
	).Scan(&id)
	return id, err
}

func SaveRCAResult(db *sqlx.DB, r models.RCAResult) (int, error) {
	var id int
	err := db.QueryRow(`
		INSERT INTO rca_results (machine_id, problem, cause, evidence, action, severity)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id`,
		r.MachineID, r.Problem, r.Cause, r.Evidence, r.Action, r.Severity,
	).Scan(&id)
	return id, err
}

func CountRecentDefects(db *sqlx.DB, machineID string, hours int) int {
	var count int
	db.QueryRow(`
		SELECT COUNT(*) FROM sensor_readings
		WHERE machine_id = $1
		  AND defect_count > 0
		  AND created_at > NOW() - INTERVAL '1 hour' * $2`,
		machineID, hours,
	).Scan(&count)
	return count
}

func GetRecentReadings(db *sqlx.DB, machineID string, limit int) ([]models.SensorReading, error) {
	var readings []models.SensorReading
	err := db.Select(&readings, `
		SELECT * FROM sensor_readings
		WHERE machine_id = $1
		ORDER BY created_at DESC
		LIMIT $2`,
		machineID, limit,
	)
	return readings, err
}

func GetAverageVibration(db *sqlx.DB, machineID string, minutes int) float64 {
	var avg float64
	db.QueryRow(`
		SELECT COALESCE(AVG(vibration), 0) FROM sensor_readings
		WHERE machine_id = $1
		  AND created_at > NOW() - INTERVAL '1 minute' * $2`,
		machineID, minutes,
	).Scan(&avg)
	return avg
}
