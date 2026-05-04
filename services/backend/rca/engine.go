package rca

import (
	"fmt"

	"github.com/geraldman/bebas-qc/backend/db"
	"github.com/geraldman/bebas-qc/backend/models"
	"github.com/jmoiron/sqlx"
)

type Rule struct {
	Problem  string
	Cause    string
	Action   string
	Severity string
}

var rules = map[string]Rule{
	"high_vibration": {
		Problem:  "Abnormal vibration detected",
		Cause:    "Conveyor belt tension abnormality or bearing wear",
		Action:   "Inspect belt tension rollers and bearings on %s",
		Severity: "high",
	},
	"overheating": {
		Problem:  "Machine temperature exceeding safe threshold",
		Cause:    "Cooling system failure or blocked ventilation",
		Action:   "Check cooling fans and ventilation on %s",
		Severity: "high",
	},
	"speed_drop": {
		Problem:  "Belt speed dropped below normal operating range",
		Cause:    "Motor load issue or mechanical resistance on belt",
		Action:   "Inspect drive motor and check for belt obstruction on %s",
		Severity: "medium",
	},
	"label_misalign": {
		Problem:  "Label misalignment detected on products",
		Cause:    "Label applicator head drift or product speed mismatch",
		Action:   "Recalibrate label applicator sensor on %s",
		Severity: "medium",
	},
}

// Threshold-based fault detection (when fault field is nil but values are abnormal)
func detectFromThresholds(p models.SensorPayload) *string {
	if p.Vibration > 1.5 {
		s := "high_vibration"
		return &s
	}
	if p.Temperature > 90 {
		s := "overheating"
		return &s
	}
	if p.BeltSpeed < 70 {
		s := "speed_drop"
		return &s
	}
	return nil
}

func Analyze(database *sqlx.DB, p models.SensorPayload) *models.RCAResult {
	// Use fault from payload or detect from thresholds
	fault := p.Fault
	if fault == nil {
		fault = detectFromThresholds(p)
	}

	// No fault detected
	if fault == nil && p.DefectCount == 0 {
		return nil
	}

	// Default result for defects with no identified fault
	result := &models.RCAResult{
		MachineID: p.MachineID,
		Problem:   fmt.Sprintf("%d defects detected with no identified fault", p.DefectCount),
		Cause:     "Unknown — manual inspection required",
		Action:    fmt.Sprintf("Inspect %s for mechanical issues", p.MachineID),
		Severity:  "low",
	}

	if fault != nil {
		rule, exists := rules[*fault]
		if exists {
			// Pull pattern evidence from database
			recentDefects := db.CountRecentDefects(database, p.MachineID, 2)
			avgVibration := db.GetAverageVibration(database, p.MachineID, 30)

			result = &models.RCAResult{
				MachineID: p.MachineID,
				Problem:   rule.Problem,
				Cause:     rule.Cause,
				Action:    fmt.Sprintf(rule.Action, p.MachineID),
				Evidence: fmt.Sprintf(
					"%d defects in past 2hrs | avg vibration last 30min: %.2f mm/s | current: %.2f mm/s",
					recentDefects, avgVibration, p.Vibration,
				),
				Severity: rule.Severity,
			}
		}
	}

	return result
}
