type BackendMode = "lovable" | "bebasqc";

const mode = (import.meta.env.VITE_BACKEND_MODE as BackendMode) ?? "lovable";

export const config = {
  appName: "BebasQC",
  tagline: "AI Defect Detection + Root Cause Analysis",
  mode,

  mqtt: {
    // Public broker used by the ESP32 sketch for prototyping.
    // For production swap to the BebasQC Mosquitto: ws://<host>:9001/mqtt
    url: import.meta.env.VITE_MQTT_URL ?? "wss://broker.hivemq.com:8884/mqtt",
    topic: import.meta.env.VITE_MQTT_TOPIC ?? "iot/smartvision",
  },

  api: {
    // When mode === "bebasqc", the frontend calls the Python FastAPI service
    // instead of Supabase Edge Functions.
    base: import.meta.env.VITE_API_BASE ?? "",
  },

  // Threshold values used by the anomaly detector (sensorStore.ts).
  thresholds: {
    machineTempWarn: 55,
    machineTempCritical: 70,
    vibrationWarn: 5,
    vibrationCritical: 8,
    humidityWarn: 80,
    distanceMin: 5,
    distanceMax: 100,
  },
} as const;

export const isBebasQC = mode === "bebasqc";
