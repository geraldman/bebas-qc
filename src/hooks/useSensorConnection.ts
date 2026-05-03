import { useEffect, useRef } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { useSensorStore } from "@/lib/sensorStore";
import { config } from "@/lib/config";

const MQTT_URL = config.mqtt.url;
const TOPIC = config.mqtt.topic;

export function useSensorConnection() {
  const { source, pushReading, setConnected } = useSensorStore();
  const clientRef = useRef<MqttClient | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Cleanup previous
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnected(false);

    if (source === "mock") {
      setConnected(true);
      // baseline values, with occasional anomaly spikes
      let tick = 0;
      const gen = () => {
        tick++;
        const anomaly = tick % 15 === 0; // every 15 ticks spike
        pushReading({
          temp_dht: 26 + Math.random() * 3,
          humidity: 55 + Math.random() * 10 + (anomaly ? 25 : 0),
          temp_ds: 45 + Math.random() * 8 + (anomaly ? 30 : 0),
          distance: 30 + Math.random() * 20,
          vibration: 2 + (Math.random() - 0.5) * 3 + (anomaly ? 7 : 0),
          timestamp: Date.now(),
        });
      };
      gen();
      intervalRef.current = setInterval(gen, 1500);
    } else {
      // MQTT WebSocket
      try {
        const client = mqtt.connect(MQTT_URL, {
          clientId: "bebasqc_web_" + Math.random().toString(16).slice(2, 8),
          reconnectPeriod: 3000,
          connectTimeout: 8000,
        });
        clientRef.current = client;

        client.on("connect", () => {
          setConnected(true);
          client.subscribe(TOPIC);
        });
        client.on("close", () => setConnected(false));
        client.on("error", (err) => {
          console.error("MQTT error", err);
          setConnected(false);
        });
        client.on("message", (_topic, payload) => {
          try {
            const data = JSON.parse(payload.toString());
            pushReading({
              temp_dht: Number(data.temp_dht) || 0,
              humidity: Number(data.humidity) || 0,
              temp_ds: Number(data.temp_ds) || 0,
              distance: Number(data.distance) || 0,
              vibration: Number(data.vibration) || 0,
              timestamp: Date.now(),
            });
          } catch (e) {
            console.warn("Bad MQTT payload", e);
          }
        });
      } catch (e) {
        console.error("MQTT connect failed", e);
      }
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [source, pushReading, setConnected]);
}