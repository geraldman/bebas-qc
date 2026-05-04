package mqtt

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/geraldman/bebas-qc/backend/db"
	"github.com/geraldman/bebas-qc/backend/models"
	"github.com/geraldman/bebas-qc/backend/rca"
	"github.com/jmoiron/sqlx"
)

type Processor struct {
	DB     *sqlx.DB
	Client pahomqtt.Client
}

func NewProcessor(database *sqlx.DB) *Processor {
	return &Processor{DB: database}
}

func (p *Processor) Start() {
	broker := fmt.Sprintf("tcp://%s:%s",
		os.Getenv("MQTT_HOST"),
		os.Getenv("MQTT_PORT"),
	)

	opts := pahomqtt.NewClientOptions()
	opts.AddBroker(broker)
	opts.SetClientID("bebasqc_backend")
	opts.SetCleanSession(true)
	opts.SetAutoReconnect(true)
	opts.SetConnectRetryInterval(3 * time.Second)

	opts.SetOnConnectHandler(func(c pahomqtt.Client) {
		log.Println("[MQTT] Connected to broker:", broker)
		p.subscribe(c)
	})

	opts.SetConnectionLostHandler(func(c pahomqtt.Client, err error) {
		log.Printf("[MQTT] Connection lost: %v — reconnecting...", err)
	})

	for {
		p.Client = pahomqtt.NewClient(opts)

		token := p.Client.Connect()
		token.Wait()
		if err := token.Error(); err != nil {
			log.Printf("[MQTT] Failed to connect: %v (retrying in 5s)", err)
			time.Sleep(5 * time.Second)
			continue
		}

		return
	}
}

func (p *Processor) subscribe(c pahomqtt.Client) {
	// Wildcard subscription — receives all machine topics
	topic := "bebasqc/#"
	c.Subscribe(topic, 1, p.handleMessage)
	log.Printf("[MQTT] Subscribed to: %s", topic)
}

func (p *Processor) handleMessage(_ pahomqtt.Client, msg pahomqtt.Message) {
	log.Printf("[MQTT] Message on topic: %s", msg.Topic())

	// 1. Parse JSON payload
	var payload models.SensorPayload
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("[MQTT] Failed to parse payload: %v", err)
		return
	}

	log.Printf("[MQTT] Received → %s | temp=%.1f°C vib=%.2f defects=%d fault=%v",
		payload.MachineID,
		payload.Temperature,
		payload.Vibration,
		payload.DefectCount,
		payload.Fault,
	)

	// 2. Save raw sensor reading to PostgreSQL
	_, err := db.SaveSensorReading(p.DB, payload)
	if err != nil {
		log.Printf("[MQTT] Failed to save sensor reading: %v", err)
		return
	}

	// 3. Run RCA engine
	result := rca.Analyze(p.DB, payload)
	if result == nil {
		log.Printf("[MQTT] No fault detected for %s — skipping RCA", payload.MachineID)
		return
	}

	log.Printf("[MQTT] RCA → %s | severity=%s | cause=%s",
		result.MachineID,
		result.Severity,
		result.Cause,
	)

	// 4. Save RCA result
	rcaID, err := db.SaveRCAResult(p.DB, *result)
	if err != nil {
		log.Printf("[MQTT] Failed to save RCA result: %v", err)
		return
	}

	// 5. Trigger n8n alert for medium and high severity
	if result.Severity == "high" || result.Severity == "medium" {
		go triggerAlert(payload, *result, rcaID)
	}
}
