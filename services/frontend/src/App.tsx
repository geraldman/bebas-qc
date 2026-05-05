import { useEffect, useMemo, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";
import {
  detectAnomalies,
  isBeltSpeedAlert,
  isMachineTempAlert,
  isVibrationAlert,
  type SensorReading,
} from "./lib/thresholds";

const MQTT_URL = import.meta.env.VITE_MQTT_URL || "ws://localhost:8000/mqtt";
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC || "bebasqc/#";

const NORMAL_BOUNDS = {
  temp_ds: [45, 54],
  humidity: [45, 75],
  vibration: [0.2, 4.5],
  belt_speed: [80, 140],
} as const;

const midpoint = (min: number, max: number) => (min + max) / 2;
const randBetween = (min: number, max: number) => min + Math.random() * (max - min);

const MACHINES = [
  {
    id: "LINE1_STN1",
    label: "Line 1 — Conveyor",
    defaults: {
      temp: midpoint(...NORMAL_BOUNDS.temp_ds),
      humidity: midpoint(...NORMAL_BOUNDS.humidity),
      vibration: midpoint(...NORMAL_BOUNDS.vibration),
      belt_speed: midpoint(...NORMAL_BOUNDS.belt_speed),
    },
  },
  {
    id: "LINE1_STN2",
    label: "Line 1 — Labeler",
    defaults: {
      temp: midpoint(...NORMAL_BOUNDS.temp_ds),
      humidity: midpoint(...NORMAL_BOUNDS.humidity),
      vibration: midpoint(...NORMAL_BOUNDS.vibration),
      belt_speed: midpoint(...NORMAL_BOUNDS.belt_speed),
    },
  },
  {
    id: "LINE2_STN1",
    label: "Line 2 — Filler",
    defaults: {
      temp: midpoint(...NORMAL_BOUNDS.temp_ds),
      humidity: midpoint(...NORMAL_BOUNDS.humidity),
      vibration: midpoint(...NORMAL_BOUNDS.vibration),
      belt_speed: midpoint(...NORMAL_BOUNDS.belt_speed),
    },
  },
  {
    id: "LINE2_STN2",
    label: "Line 2 — Sealer",
    defaults: {
      temp: midpoint(...NORMAL_BOUNDS.temp_ds),
      humidity: midpoint(...NORMAL_BOUNDS.humidity),
      vibration: midpoint(...NORMAL_BOUNDS.vibration),
      belt_speed: midpoint(...NORMAL_BOUNDS.belt_speed),
    },
  },
];

const machineLabel = (id: string) => MACHINES.find((m) => m.id === id)?.label || id;

function App() {
  const [source, setSource] = useState<"mock" | "mqtt">("mock");
  const [connected, setConnected] = useState(false);
  const [readingsByMachine, setReadingsByMachine] = useState<Record<string, SensorReading[]>>({});
  const [latestByMachine, setLatestByMachine] = useState<Record<string, SensorReading>>({});
  const [muted, setMuted] = useState(false);
  const [activeMachineId, setActiveMachineId] = useState(MACHINES[0].id);
  const intervalRef = useRef<number | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  const recordReading = (reading: SensorReading) => {
    const id = reading.machine_id || "UNKNOWN";
    setReadingsByMachine((prev) => {
      const next = [...(prev[id] || []), reading].slice(-30);
      return { ...prev, [id]: next };
    });
    setLatestByMachine((prev) => ({ ...prev, [id]: reading }));
  };

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }

    setConnected(false);

    if (source === "mock") {
      setConnected(true);
      let tick = 0;
      const gen = () => {
        tick += 1;
        const anomaly = tick % 15 === 0;
        const anomalyTarget = anomaly
          ? MACHINES[Math.floor(Math.random() * MACHINES.length)].id
          : null;

        MACHINES.forEach((machine) => {
          const isAnomaly = anomalyTarget === machine.id;
          const temp_ds = randBetween(...NORMAL_BOUNDS.temp_ds) + (isAnomaly ? 30 : 0);
          const belt_speed = randBetween(...NORMAL_BOUNDS.belt_speed) + (isAnomaly ? -40 : 0);
          const next: SensorReading = {
            machine_id: machine.id,
            temp_dht: temp_ds - 12 + Math.random() * 4,
            humidity: randBetween(...NORMAL_BOUNDS.humidity) + (isAnomaly ? 20 : 0),
            temp_ds,
            belt_speed,
            vibration: randBetween(...NORMAL_BOUNDS.vibration) + (isAnomaly ? 7 : 0),
            timestamp: Date.now(),
          };
          recordReading(next);
        });
      };
      gen();
      intervalRef.current = window.setInterval(gen, 1500);
    } else {
      const client = mqtt.connect(MQTT_URL, {
        clientId: `bebasqc_web_${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 3000,
        connectTimeout: 8000,
      });
      clientRef.current = client;

      client.on("connect", () => {
        setConnected(true);
        client.subscribe(MQTT_TOPIC);
      });
      client.on("close", () => setConnected(false));
      client.on("error", () => setConnected(false));
      client.on("message", (_topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          const machineId = String(data.machine_id ?? data.machineId ?? "UNKNOWN");
          const tempValue = Number(data.temp_ds ?? data.temp_dht ?? data.temperature ?? 0);
          const next: SensorReading = {
            machine_id: machineId,
            temp_dht: Number(data.temp_dht ?? data.temperature ?? 0),
            humidity: Number(data.humidity ?? 0),
            temp_ds: tempValue,
            belt_speed: Number(data.belt_speed ?? data.beltSpeed ?? data.speed ?? 0),
            vibration: Number(data.vibration ?? 0),
            timestamp: Date.now(),
          };
          recordReading(next);
        } catch (e) {
          console.warn("Bad MQTT payload", e);
        }
      });
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
    };
  }, [source]);

  const machineIds = useMemo(() => {
    const known = MACHINES.map((m) => m.id);
    const extras = Object.keys(latestByMachine).filter((id) => !known.includes(id));
    return [...known, ...extras];
  }, [latestByMachine]);

  useEffect(() => {
    if (!latestByMachine[activeMachineId]) {
      const first = machineIds.find((id) => latestByMachine[id]);
      if (first && first !== activeMachineId) {
        setActiveMachineId(first);
      }
    }
  }, [latestByMachine, machineIds, activeMachineId]);

  const activeLatest = latestByMachine[activeMachineId] || null;
  const activeReadings = readingsByMachine[activeMachineId] || [];

  const anomaliesByMachine = useMemo(() => {
    const entries = Object.entries(latestByMachine).map(([id, reading]) => [id, detectAnomalies(reading)] as const);
    return Object.fromEntries(entries);
  }, [latestByMachine]);

  const allAnomalies = useMemo(
    () =>
      Object.entries(anomaliesByMachine).flatMap(([id, list]) =>
        list.map((a) => ({ ...a, machine: id }))
      ),
    [anomaliesByMachine]
  );

  const anomalies = useMemo(() => detectAnomalies(activeLatest), [activeLatest]);
  const status = anomalies.some((a) => a.severity === "critical")
    ? "critical"
    : allAnomalies.length > 0
      ? "warning"
      : "ok";

  const chartData = activeReadings.map((r) => ({
    t: new Date(r.timestamp).toLocaleTimeString("en-US", { minute: "2-digit", second: "2-digit" }),
    temp_ds: Number(r.temp_ds.toFixed(1)),
    vibration: Number(r.vibration.toFixed(2)),
    humidity: Number(r.humidity.toFixed(1)),
    belt_speed: Number(r.belt_speed.toFixed(1)),
  }));

  return (
    <div className="dashboard">
      <div className="header-row">
        <div>
          <h2 className="title">Production Line Monitor</h2>
          <p className="subtitle">Real-time IoT + AI defect intelligence</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-outline btn-icon"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted ? "Mute" : "Sound"}
          </button>
          <div className="source-toggle">
            <label htmlFor="source" className="label">
              {source === "mock" ? "Mock Data" : "Live MQTT"}
            </label>
            <input
              id="source"
              type="checkbox"
              checked={source === "mqtt"}
              onChange={(e) => setSource(e.target.checked ? "mqtt" : "mock")}
            />
            <span className={connected ? "status-dot ok" : "status-dot"} />
          </div>
          <a className="btn" href="/detect">
            Inspect Product
          </a>
        </div>
      </div>

      <div className={`status-banner ${status}`}>
        <div className="status-icon">{status === "ok" ? "OK" : "!"}</div>
        <div className="status-text">
          <div className="status-title">
            Machine Status: {status === "ok" ? "All Normal" : status === "warning" ? "Warning" : "Critical Anomaly"}
          </div>
          {allAnomalies.length > 0 && (
            <div className="status-sub">
              {allAnomalies
                .map((a) => `${machineLabel(a.machine)} ${a.sensor} ${a.threshold}`)
                .join(" | ")}
            </div>
          )}
        </div>
        {allAnomalies.length > 0 && (
          <a className="btn btn-outline" href="/rca">
            Run RCA
          </a>
        )}
      </div>

      <div className="machine-grid">
        {machineIds.map((id) => {
          const reading = latestByMachine[id] || null;
          const machineAnoms = anomaliesByMachine[id] || [];
          const level = machineAnoms.some((a) => a.severity === "critical")
            ? "critical"
            : machineAnoms.length > 0
              ? "warning"
              : "ok";
          return (
            <button
              key={id}
              type="button"
              className={`machine-card ${activeMachineId === id ? "active" : ""}`}
              onClick={() => setActiveMachineId(id)}
            >
              <div className="machine-header">
                <div>
                  <div className="machine-label">{machineLabel(id)}</div>
                  <div className="machine-id">{id}</div>
                </div>
                <span className={`status-pill ${level}`}>{level.toUpperCase()}</span>
              </div>
              <div className="machine-metrics">
                <div className="metric">
                  <span className="metric-label">Temp</span>
                  <span className="metric-value">{reading ? reading.temp_ds.toFixed(1) : "-"} deg C</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Humidity</span>
                  <span className="metric-value">{reading ? reading.humidity.toFixed(1) : "-"}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Vibration</span>
                  <span className="metric-value">{reading ? reading.vibration.toFixed(2) : "-"} m/s^2</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Belt Speed</span>
                  <span className="metric-value">{reading ? reading.belt_speed.toFixed(0) : "-"} items/min</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sensor-grid">
        <SensorCard label="Air Temp" value={activeLatest?.temp_dht} unit="deg C" />
        <SensorCard label="Humidity" value={activeLatest?.humidity} unit="%" />
        <SensorCard
          label="Machine Temp"
          value={activeLatest?.temp_ds}
          unit="deg C"
          alert={isMachineTempAlert(activeLatest)}
        />
        <SensorCard
          label="Belt Speed"
          value={activeLatest?.belt_speed}
          unit="items/min"
          alert={isBeltSpeedAlert(activeLatest)}
        />
        <SensorCard
          label="Vibration"
          value={activeLatest?.vibration}
          unit="m/s^2"
          alert={isVibrationAlert(activeLatest)}
        />
      </div>

      <div className="chart-grid">
        <ChartCard title="Machine Temperature" dataKey="temp_ds" color="#ef4444" unit="deg C" data={chartData} />
        <ChartCard title="Belt Speed" dataKey="belt_speed" color="#0ea5e9" unit="items/min" data={chartData} />
        <ChartCard title="Vibration" dataKey="vibration" color="#f59e0b" unit="m/s^2" data={chartData} />
      </div>

      <div className="config-card">
        <h3>MQTT Configuration</h3>
        <div>Broker: <code>{MQTT_URL}</code></div>
        <div>Topic: <code>{MQTT_TOPIC}</code></div>
        <div>ESP32 publishes: temp_dht, humidity, temp_ds, belt_speed, vibration</div>
      </div>
    </div>
  );
}

function SensorCard({
  label,
  value,
  unit,
  alert,
}: {
  label: string;
  value?: number;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div className={`card ${alert ? "card-alert" : ""}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">
        {value !== undefined && value !== null ? value.toFixed(1) : "-"}
        <span className="card-unit">{unit}</span>
      </div>
      {alert && <span className="badge badge-alert">High</span>}
    </div>
  );
}

function ChartCard({
  title,
  dataKey,
  color,
  unit,
  data,
}: {
  title: string;
  dataKey: "temp_ds" | "vibration" | "humidity" | "belt_speed";
  color: string;
  unit: string;
  data: Array<Record<string, string | number>>;
}) {
  return (
    <div className="card chart-card">
      <div className="card-label">{title}</div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="t" tick={{ fontSize: 10 }} minTickGap={20} />
            <YAxis tick={{ fontSize: 10 }} width={42} />
            <Tooltip formatter={(value) => [`${value} ${unit}`, title]} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default App;
