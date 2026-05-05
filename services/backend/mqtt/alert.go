package mqtt

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/geraldman/bebas-qc/backend/models"
)

type AlertPayload struct {
	MachineID string `json:"machine_id"`
	Problem   string `json:"problem"`
	Cause     string `json:"cause"`
	Evidence  string `json:"evidence"`
	Action    string `json:"action"`
	Severity  string `json:"severity"`
	Timestamp string `json:"timestamp"`
}

const alertCooldown = 10 * time.Second

var alertMu sync.Mutex
var lastAlertAt time.Time
var alertInFlight bool

func beginAlert(now time.Time) bool {
	alertMu.Lock()
	defer alertMu.Unlock()

	if alertInFlight {
		return false
	}
	if !lastAlertAt.IsZero() && now.Sub(lastAlertAt) < alertCooldown {
		return false
	}

	alertInFlight = true
	return true
}

func finishAlert(sent bool) {
	alertMu.Lock()
	defer alertMu.Unlock()

	alertInFlight = false
	if sent {
		lastAlertAt = time.Now().UTC()
	}
}

func triggerAlert(sensor models.SensorPayload, result models.RCAResult, rcaID int) {
	now := time.Now().UTC()
	if !beginAlert(now) {
		log.Printf("[ALERT] Cooldown/in-flight active, skipping n8n trigger for machine=%s", result.MachineID)
		return
	}
	defer func() {
		finishAlert(false)
	}()

	n8nURL := os.Getenv("N8N_WEBHOOK_URL")
	if n8nURL == "" {
		n8nURL = "http://n8n:5678/webhook/smartvision/detection"
	}

	alert := AlertPayload{
		MachineID: result.MachineID,
		Problem:   result.Problem,
		Cause:     result.Cause,
		Evidence:  result.Evidence,
		Action:    result.Action,
		Severity:  result.Severity,
		Timestamp: now.Format(time.RFC3339),
	}

	body, _ := json.Marshal(alert)

	resp, err := http.Post(n8nURL, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[ALERT] Failed to trigger n8n: %v", err)
		return
	}
	defer resp.Body.Close()
	finishAlert(true)

	log.Printf("[ALERT] n8n triggered → status=%d machine=%s severity=%s",
		resp.StatusCode,
		result.MachineID,
		result.Severity,
	)
}
