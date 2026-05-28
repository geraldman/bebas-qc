import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  detectAnomalies,
  isBeltSpeedAlert,
  isMachineTempAlert,
  isVibrationAlert,
  type SensorReading,
} from "../lib/thresholds";
import Simulator from "./Simulator";

const MQTT_URL = import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname}:8000/mqtt`;
const API_BASE = import.meta.env.VITE_API_BASE || "";

const withApiBase = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (!API_BASE) return path;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};

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

type RoboflowPrediction = {
  class?: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type RoboflowResult = {
  predictions?: RoboflowPrediction[];
  outputs?: Array<{ predictions?: RoboflowPrediction[] }>;
};

type RCAResult = {
  id: number;
  machine_id: string;
  problem: string;
  cause: string;
  evidence: string;
  action: string;
  severity: "low" | "medium" | "high";
  created_at: string;
};

interface DashboardProps {
  navigate: (to: string) => void;
  containerId: string;
}

export default function Dashboard({ navigate, containerId }: DashboardProps) {
  useEffect(() => {
    window.name = "bebasqc_dashboard";
  }, []);

  const mqttTopic = useMemo(() => {
    const envTopic = import.meta.env.VITE_MQTT_TOPIC;
    if (envTopic) return envTopic;
    return containerId ? `bebasqc/${containerId}/#` : "bebasqc/#";
  }, [containerId]);

  const [source, setSource] = useState<"mock" | "mqtt">("mock");
  const [connected, setConnected] = useState(false);
  const [readingsByMachine, setReadingsByMachine] = useState<Record<string, SensorReading[]>>({});
  const [latestByMachine, setLatestByMachine] = useState<Record<string, SensorReading>>({});
  const [muted, setMuted] = useState(false);
  const [activeMachineId, setActiveMachineId] = useState(MACHINES[0].id);
  const [cvResult, setCvResult] = useState<RoboflowResult | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [monitorImage, setMonitorImage] = useState<string>("");
  const [showSimulator, setShowSimulator] = useState(false);
  const [latestRCA, setLatestRCA] = useState<RCAResult | null>(null);
  const [showMqttInfo, setShowMqttInfo] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const clientRef = useRef<MqttClient | null>(null);
  const lastInferenceRef = useRef<string>("");

  const fetchLatestRCA = useCallback(() => {
    fetch(`${API_BASE}/api/rca?limit=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: RCAResult[]) => {
        setLatestRCA(Array.isArray(data) && data.length > 0 ? data[0] : null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLatestRCA();
    const interval = setInterval(fetchLatestRCA, 20000);
    return () => clearInterval(interval);
  }, [fetchLatestRCA]);

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
        client.subscribe(mqttTopic);
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
  }, [source, mqttTopic]);

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
  const activeLevel = useMemo(() => {
    if (anomalies.some((a) => a.severity === "critical")) return "critical";
    if (anomalies.length > 0) return "warning";
    return "ok";
  }, [anomalies]);
  const status = anomalies.some((a) => a.severity === "critical")
    ? "critical"
    : allAnomalies.length > 0
      ? "warning"
      : "ok";

  useEffect(() => {
    const status = activeLevel === "ok" ? "ok" : "defect";
    const controller = new AbortController();

    fetch(`${API_BASE}/api/vision/frame?status=${status}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("frame fetch failed"))))
      .then((data: { image_url?: string }) => {
        setMonitorImage(withApiBase(data.image_url || ""));
      })
      .catch(() => {
        setMonitorImage("");
      });

    return () => controller.abort();
  }, [activeLevel, activeMachineId]);

  useEffect(() => {
    if (!monitorImage) {
      setCvResult(null);
      return;
    }

    const key = `${activeMachineId}:${activeLevel}:${monitorImage}`;
    if (lastInferenceRef.current === key) return;
    lastInferenceRef.current = key;

    const controller = new AbortController();
    setCvLoading(true);
    setCvError(null);

    fetch(`${API_BASE}/api/vision/roboflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: monitorImage,
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: RoboflowResult) => {
        setCvResult(data);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          setCvError("Roboflow inference failed");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCvLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeMachineId, activeLevel, monitorImage]);

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
            onClick={() => setShowSimulator(true)}
            className="btn btn-outline"
            style={{ marginRight: "4px" }}
          >
            🔌 IoT Simulator
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/rca")}
            style={{ marginRight: "4px", backgroundColor: "#6366f1", color: "#fff", borderColor: "#6366f1" }}
          >
            🔍 RCA Log
          </button>
          <a
            href={`https://t.me/BebasQcBot?start=${containerId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
            style={{ marginRight: "4px", backgroundColor: "#0088cc", color: "#ffffff", borderColor: "#0088cc" }}
          >
            📲 Telegram
          </a>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/")}
            style={{ marginRight: "4px" }}
          >
            ← Hub
          </button>
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
          <button
            type="button"
            className="btn"
            onClick={() => navigate("/inspect")}
          >
            🖥 Inspect Machine
          </button>
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
          <button className="btn btn-outline" type="button" onClick={() => navigate("/rca")}>
            View RCA Log
          </button>
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

      <section className="monitor-panel">
        <div className="monitor-header">
          <div>
            <h3>{machineLabel(activeMachineId)} Monitor</h3>
            <p>Vision simulation + line telemetry</p>
          </div>
          <span className={`status-pill ${activeLevel}`}>{activeLevel.toUpperCase()}</span>
        </div>
        <div className="monitor-body">
          <div className="monitor-frame">
            {monitorImage ? (
              <img src={monitorImage} alt={`${machineLabel(activeMachineId)} frame`} />
            ) : (
              <div className="monitor-empty">
                Waiting for backend frame. Add images to assets/roboflow/ok and assets/roboflow/defect.
              </div>
            )}
            {cvLoading && <div className="monitor-overlay">Running inference...</div>}
          </div>
          <div className="monitor-details">
            <div className="monitor-meta">
              <div className="meta-row">
                <span className="meta-label">Machine</span>
                <span className="meta-value">{activeMachineId}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Temp</span>
                <span className="meta-value">{activeLatest ? activeLatest.temp_ds.toFixed(1) : "-"} deg C</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Humidity</span>
                <span className="meta-value">{activeLatest ? activeLatest.humidity.toFixed(1) : "-"}%</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Belt Speed</span>
                <span className="meta-value">{activeLatest ? activeLatest.belt_speed.toFixed(0) : "-"} items/min</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Vibration</span>
                <span className="meta-value">{activeLatest ? activeLatest.vibration.toFixed(2) : "-"} m/s^2</span>
              </div>
            </div>

            <div className="monitor-results">
              <h4>Roboflow Results</h4>
              {cvError && <div className="monitor-error">{cvError}</div>}
              {(() => {
                const preds = cvResult?.predictions;
                const outputPreds = cvResult?.outputs?.[0]?.predictions;
                const list = Array.isArray(preds) ? preds : Array.isArray(outputPreds) ? outputPreds : [];
                if (list.length === 0) {
                  return !cvError && !cvLoading && <div className="monitor-empty">No predictions yet</div>;
                }
                return (
                  <ul>
                    {list.map((p, idx) => (
                      <li key={`${p.class || "object"}-${idx}`}>
                        <span className="chip">{p.class || "object"}</span>
                        <span>{p.confidence ? `${(p.confidence * 100).toFixed(0)}%` : "-"}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

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

      {/* Latest RCA Finding Card */}
      <div className="config-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Latest RCA Finding</h3>
          <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px" }} onClick={() => navigate("/rca")}>
            View All →
          </button>
        </div>
        {latestRCA ? (
          <div style={
            {
              borderLeft: `4px solid ${{ high: "#ef4444", medium: "#f59e0b", low: "#22c55e" }[latestRCA.severity] || "#94a3b8"}`,
              paddingLeft: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6
            }
          }>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", padding: "2px 8px", borderRadius: 5,
                background: { high: "rgba(239,68,68,0.12)", medium: "rgba(245,158,11,0.12)", low: "rgba(34,197,94,0.12)" }[latestRCA.severity] || "#f1f5f9",
                color: { high: "#ef4444", medium: "#d97706", low: "#16a34a" }[latestRCA.severity] || "#64748b",
              }}>
                {latestRCA.severity.toUpperCase()}
              </span>
              <code style={{ fontSize: 12, color: "#64748b" }}>{latestRCA.machine_id}</code>
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
                {new Date(latestRCA.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{latestRCA.problem}</div>
            <div style={{ fontSize: 13, color: "#475569" }}>Cause: {latestRCA.cause}</div>
            <div style={{ fontSize: 13, color: "#3730a3", fontWeight: 500 }}>Action: {latestRCA.action}</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
            No RCA events yet. Use the IoT Simulator to trigger a fault and watch the engine analyze it.
          </div>
        )}
      </div>

      {/* MQTT Config (collapsible) */}
      <div className="config-card">
        <button
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, fontSize: 15, fontWeight: 600, color: "#374151" }}
          onClick={() => setShowMqttInfo((v) => !v)}
        >
          <span>{showMqttInfo ? "▼" : "▶"}</span> MQTT Configuration
        </button>
        {showMqttInfo && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#64748b", display: "flex", flexDirection: "column", gap: 4 }}>
            <div>Broker: <code>{MQTT_URL}</code></div>
            <div>Topic: <code>{mqttTopic}</code></div>
            <div>ESP32 publishes: temp_dht, humidity, temp_ds, belt_speed, vibration</div>
          </div>
        )}
      </div>

      <div className={`sim-drawer-overlay ${showSimulator ? "open" : ""}`} onClick={() => setShowSimulator(false)}>
        <div className="sim-drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="sim-drawer-header">
            <h3>IoT Edge Sensor Simulator</h3>
            <button type="button" className="sim-drawer-close" onClick={() => setShowSimulator(false)}>✕ Close</button>
          </div>
          <div className="sim-drawer-body">
            <Simulator containerId={containerId} isOverlay={true} />
          </div>
        </div>
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
