import { useEffect, useRef, useState, useMemo } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { useSimulator } from "../SimulatorContext";

const MQTT_URL = import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname}:8000/mqtt`;

interface InspectMachineProps {
  navigate: (to: string) => void;
  containerId: string;
}

interface TelemetryData {
  machine_id: string;
  machineId?: string;
  machine_type: string;
  temp_dht: number;
  temp_ds: number;
  humidity: number;
  vibration: number;
  belt_speed: number;
  defect_count: number;
  fault: string | null;
  timestamp: string;
  cycle: number;
}

interface AlarmLog {
  id: string;
  timestamp: string;
  machineId: string;
  message: string;
  severity: "warning" | "critical" | "resolved";
}

interface RCAResult {
  id: number;
  machine_id: string;
  problem: string;
  cause: string;
  evidence: string;
  action: string;
  severity: "low" | "medium" | "high";
  created_at: string;
}

const MACHINES = [
  { id: "LINE1_STN1", label: "Line 1 — Conveyor", suffix: "line1/station1/sensors", defaults: { temp: 49.5, speed: 110.0, vibration: 2.35 } },
  { id: "LINE1_STN2", label: "Line 1 — Labeler", suffix: "line1/station2/sensors", defaults: { temp: 49.5, speed: 110.0, vibration: 2.35 } },
  { id: "LINE2_STN1", label: "Line 2 — Filler", suffix: "line2/station1/sensors", defaults: { temp: 49.5, speed: 110.0, vibration: 2.35 } },
  { id: "LINE2_STN2", label: "Line 2 — Sealer", suffix: "line2/station2/sensors", defaults: { temp: 49.5, speed: 110.0, vibration: 2.35 } },
];

export default function InspectMachine({ navigate, containerId }: InspectMachineProps) {
  const { openSimulator } = useSimulator();
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<Record<string, TelemetryData>>({});
  const [activeMachineId, setActiveMachineId] = useState<string>("LINE1_STN1");
  const [alarms, setAlarms] = useState<AlarmLog[]>([]);
  const [rawPackets, setRawPackets] = useState<Record<string, TelemetryData[]>>({});
  const [rcaFindings, setRcaFindings] = useState<RCAResult[]>([]);
  
  const clientRef = useRef<MqttClient | null>(null);

  const activeTopic = useMemo(() => {
    return containerId ? `bebasqc/${containerId}/#` : "bebasqc/#";
  }, [containerId]);

  // Connect to MQTT broker
  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: `bebasqc_scada_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 2500,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      client.subscribe(activeTopic);
    });

    client.on("close", () => setConnected(false));
    client.on("error", () => setConnected(false));

    client.on("message", (_topic, message) => {
      try {
        const payload: TelemetryData = JSON.parse(message.toString());
        const mId = payload.machine_id || payload.machineId || "UNKNOWN";
        
        // Update live telemetry
        setTelemetry((prev) => ({ ...prev, [mId]: payload }));

        // Append to raw packet log
        setRawPackets((prev) => {
          const list = prev[mId] || [];
          return { ...prev, [mId]: [payload, ...list].slice(0, 3) };
        });

        // Parse alarm threshold breaches
        processAlarm(payload);

      } catch (err) {
        console.error("Failed to parse SCADA packet:", err);
      }
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, [activeTopic]);

  // Alert/Alarm rule processing
  const processAlarm = (data: TelemetryData) => {
    const mId = data.machine_id;
    let alarmMsg = "";
    let severity: "warning" | "critical" | "resolved" = "resolved";

    if (data.fault) {
      severity = "critical";
      alarmMsg = `Machine Fault Triggered: ${data.fault.replace(/_/g, " ").toUpperCase()}`;
    } else if (data.temp_ds > 70 || data.vibration > 8) {
      severity = "critical";
      alarmMsg = `Critical threshold breach! Temp: ${data.temp_ds.toFixed(1)}°C | Vib: ${data.vibration.toFixed(2)}m/s²`;
    } else if (data.temp_ds > 55 || data.vibration > 5 || data.belt_speed < 70) {
      severity = "warning";
      alarmMsg = `Warning threshold breach. Temp: ${data.temp_ds.toFixed(1)}°C | Vib: ${data.vibration.toFixed(2)}m/s² | Speed: ${data.belt_speed.toFixed(0)}`;
    }

    if (alarmMsg) {
      setAlarms((prev) => {
        // Only append if there isn't already a identical active alarm to prevent duplicate flood
        const exists = prev.find(a => a.machineId === mId && a.message === alarmMsg);
        if (exists) return prev;
        
        const newAlarm: AlarmLog = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          machineId: mId,
          message: alarmMsg,
          severity
        };
        return [newAlarm, ...prev].slice(0, 50);
      });
    } else {
      // If machine returned to normal, remove active alarms for it or add a resolution log
      setAlarms((prev) => {
        const activeForMachine = prev.filter(a => a.machineId === mId && a.severity !== "resolved");
        if (activeForMachine.length > 0) {
          const resLog: AlarmLog = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            machineId: mId,
            message: `System status restored to normal.`,
            severity: "resolved"
          };
          return [resLog, ...prev.filter(a => a.machineId !== mId)].slice(0, 50);
        }
        return prev;
      });
    }
  };

  // Fetch RCA findings for the active machine
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || "";
    const fetchMachineRCA = () => {
      fetch(`${API_BASE}/api/rca?machine_id=${activeMachineId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: RCAResult[]) => {
          setRcaFindings(data || []);
        })
        .catch(() => {
          setRcaFindings([]);
        });
    };
    fetchMachineRCA();
    const interval = setInterval(fetchMachineRCA, 10000);
    return () => clearInterval(interval);
  }, [activeMachineId]);

  const getMachineHealth = (id: string) => {
    const data = telemetry[id];
    if (!data) return "offline";
    if (data.fault || data.temp_ds > 70 || data.vibration > 8) return "critical";
    if (data.temp_ds > 55 || data.vibration > 5 || data.belt_speed < 70) return "warning";
    return "ok";
  };

  const activeMachineData = telemetry[activeMachineId] || null;
  const activeMachinePackets = rawPackets[activeMachineId] || [];

  return (
    <div className="scada-panel">
      {/* SCADA CSS Variables & Custom Dark-Themed Cockpit Styles */}
      <style>{`
        .scada-panel {
          background-color: #080c14;
          background-image: 
            linear-gradient(rgba(18, 30, 49, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(18, 30, 49, 0.3) 1px, transparent 1px);
          background-size: 24px 24px;
          min-height: 100vh;
          color: #94a3b8;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          padding: 24px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .scada-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px 24px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }

        .scada-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .scada-badge {
          background: #0284c7;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .scada-title {
          font-size: 20px;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .scada-title span {
          color: #38bdf8;
        }

        .scada-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .scada-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid #334155;
          border-radius: 8px;
          font-size: 12px;
        }

        .scada-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: block;
        }
        
        .scada-dot.connected { background-color: #10b981; box-shadow: 0 0 8px #10b981; }
        .scada-dot.disconnected { background-color: #ef4444; box-shadow: 0 0 8px #ef4444; }

        .scada-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          flex-grow: 1;
        }

        @media (max-width: 1024px) {
          .scada-layout {
            grid-template-columns: 1fr;
          }
        }

        .scada-canvas {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 24px;
          box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 480px;
        }

        .canvas-label {
          position: absolute;
          top: 16px;
          left: 20px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* SVG Schematic Styles */
        .scada-svg {
          width: 100%;
          max-width: 800px;
          height: auto;
          overflow: visible;
        }

        .schematic-bg-line {
          stroke: #1e293b;
          stroke-width: 3;
          fill: none;
        }

        .schematic-flow-line {
          stroke-width: 2;
          fill: none;
          stroke-dasharray: 6, 6;
        }

        .flow-line1 {
          stroke: #38bdf8;
          animation: stroke-dash-move 0.8s linear infinite;
        }

        .flow-line2 {
          stroke: #f59e0b;
          animation: stroke-dash-move 0.8s linear infinite;
        }

        @keyframes stroke-dash-move {
          to {
            stroke-dashoffset: -12;
          }
        }

        .machine-node {
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .machine-node:hover {
          transform: translateY(-2px);
        }

        .machine-node-bg {
          fill: #0f172a;
          stroke: #334155;
          stroke-width: 2;
          transition: stroke 0.3s, filter 0.3s;
        }

        .machine-node.active .machine-node-bg {
          stroke: #38bdf8 !important;
          filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.4));
        }

        .machine-node.health-ok .machine-node-bg {
          stroke: #10b981;
        }

        .machine-node.health-warning .machine-node-bg {
          stroke: #f59e0b;
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.3));
        }

        .machine-node.health-critical .machine-node-bg {
          stroke: #ef4444;
          filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.5));
          animation: node-error-pulse 1.5s infinite alternate;
        }

        @keyframes node-error-pulse {
          0% { stroke-width: 2; }
          100% { stroke-width: 4; stroke: #ff6b6b; }
        }

        .machine-node-text {
          font-size: 10px;
          font-weight: 700;
          fill: #f1f5f9;
        }

        .machine-node-sub {
          font-size: 8px;
          fill: #64748b;
        }

        .machine-node-val {
          font-size: 9px;
          font-weight: 600;
          fill: #38bdf8;
        }

        /* SVG Animations */
        .animated-conveyor {
          stroke-dasharray: 5, 5;
          animation: conveyor-run 1s linear infinite;
        }
        
        @keyframes conveyor-run {
          to { stroke-dashoffset: -10; }
        }

        .animated-piston {
          animation: piston-press 1.2s ease-in-out infinite alternate;
        }

        @keyframes piston-press {
          0% { transform: translateY(0); }
          20% { transform: translateY(0); }
          60% { transform: translateY(12px); }
          100% { transform: translateY(0); }
        }

        .animated-arm {
          transform-origin: 220px 105px;
          animation: arm-label 2.5s ease-in-out infinite;
        }

        @keyframes arm-label {
          0% { transform: rotate(0deg); }
          40% { transform: rotate(-25deg); }
          50% { transform: rotate(-25deg); }
          70% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }

        .animated-valve-drop {
          fill: #38bdf8;
          animation: fluid-drop 1.8s linear infinite;
        }

        @keyframes fluid-drop {
          0% { cy: 110; opacity: 0; }
          20% { opacity: 1; }
          70% { cy: 135; opacity: 1; }
          75% { cy: 136; opacity: 0; }
          100% { cy: 110; opacity: 0; }
        }

        /* Side Inspector Panel */
        .scada-inspector {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .inspector-header {
          border-bottom: 1px solid #1e293b;
          padding-bottom: 12px;
        }

        .inspector-title {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 4px;
        }

        .inspector-subtitle {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* SCADA Gauge Dial */
        .scada-gauges {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .scada-gauge-box {
          background: rgba(30, 41, 59, 0.3);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 14px;
          text-align: center;
          position: relative;
        }

        .gauge-svg {
          width: 80px;
          height: 80px;
          margin: 0 auto 8px;
        }

        .gauge-bg {
          fill: none;
          stroke: #1e293b;
          stroke-width: 6;
        }

        .gauge-value-arc {
          fill: none;
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dasharray 0.5s ease, stroke 0.3s;
        }

        .gauge-number {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .gauge-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }

        /* Vibration Waves */
        .vibration-panel {
          background: rgba(30, 41, 59, 0.3);
          border: 1px solid #334155;
          border-radius: 12px;
          padding: 16px;
        }

        .vibe-wave-header {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .vibe-wave-wrap {
          height: 48px;
          border-radius: 6px;
          background: #090d16;
          border: 1px solid #1e293b;
          overflow: hidden;
          position: relative;
        }

        .vibe-sine-wave {
          width: 100%;
          height: 100%;
          stroke: #10b981;
          stroke-width: 2;
          fill: none;
          stroke-linecap: round;
        }

        /* Machine Controller Overrides */
        .scada-controls {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .controls-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .scada-btn {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .scada-btn:active {
          transform: translateY(1px);
        }

        .btn-estop {
          background: #ef4444;
          color: #ffffff;
          grid-column: span 2;
          font-weight: 700;
        }

        .btn-estop:hover { background: #dc2626; }

        .btn-reset {
          background: #10b981;
          color: #ffffff;
          grid-column: span 2;
        }

        .btn-reset:hover { background: #059669; }

        .btn-inject {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .btn-inject:hover {
          background: rgba(245, 158, 11, 0.2);
        }

        /* Raw MQTT Console packet log */
        .scada-console {
          background: #090d16;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 12px;
          font-family: ui-monospace, monospace;
          font-size: 10px;
          color: #0284c7;
          display: flex;
          flex-direction: column;
          gap: 8px;
          height: 100px;
          overflow-y: auto;
        }

        .console-row {
          word-break: break-all;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        /* Alarms Panel */
        .scada-alarms {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px 20px;
          max-height: 180px;
          overflow-y: auto;
        }

        .alarms-title-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 6px;
        }

        .alarms-title-bar h3 {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alarm-count-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .alarms-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .alarm-item {
          display: grid;
          grid-template-columns: 80px 100px 1fr;
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 6px;
          background: rgba(30, 41, 59, 0.2);
          border-left: 3px solid #64748b;
        }

        .alarm-item.warning {
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
          color: #fbe5c9;
        }

        .alarm-item.critical {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
          color: #fecdd3;
          animation: alarm-flash 2s infinite alternate;
        }

        .alarm-item.resolved {
          border-left-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          color: #d1fae5;
        }

        @keyframes alarm-flash {
          0% { background-color: rgba(239, 68, 68, 0.05); }
          100% { background-color: rgba(239, 68, 68, 0.15); }
        }

        .alarm-time {
          color: #475569;
        }

        .alarm-node {
          font-weight: 700;
          color: #94a3b8;
        }

        .alarm-msg {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      {/* Header bar */}
      <header className="scada-header">
        <div className="scada-logo">
          <span className="scada-badge">SCADA Node</span>
          <h1 className="scada-title">Bebas QC <span>Industrial Control</span></h1>
        </div>
        <div className="scada-actions">
          <div className="scada-status-indicator">
            <span className={`scada-dot ${connected ? "connected" : "disconnected"}`} />
            <span>Broker: {connected ? "Connected" : "Disconnected"}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={openSimulator}
            style={{ backgroundColor: "#f59e0b", color: "#ffffff", borderColor: "#f59e0b" }}
          >
            🔌 Run IoT Simulator
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/dashboard")}>
            ← QC Dashboard
          </button>
        </div>
      </header>

      {/* Primary Layout */}
      <div className="scada-layout">
        {/* Visual Schematic Diagram */}
        <div className="scada-canvas">
          <span className="canvas-label">Telemetry Synoptics — Production Lines</span>
          
          <svg className="scada-svg" viewBox="0 0 800 360">
            {/* Defs for gradients & patterns */}
            <defs>
              <pattern id="conveyor-track" width="20" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="5" x2="20" y2="5" stroke="#1e293b" strokeWidth="2" />
                <line x1="5" y1="0" x2="5" y2="10" stroke="#334155" strokeWidth="1" />
              </pattern>
              <linearGradient id="tankGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* FLOW LINES CONNECTING NODES */}
            {/* Line 1 Connectors */}
            <path d="M 120 120 L 260 120" className="schematic-bg-line" />
            <path d="M 120 120 L 260 120" className="schematic-flow-line flow-line1" />
            <path d="M 260 120 L 380 120" className="schematic-bg-line" />
            
            {/* Line 2 Connectors */}
            <path d="M 120 250 L 260 250" className="schematic-bg-line" />
            <path d="M 120 250 L 260 250" className="schematic-flow-line flow-line2" />
            <path d="M 260 250 L 380 250" className="schematic-bg-line" />

            {/* PIPELINES AND CONVEYORS */}
            {/* Line 1 Track */}
            <rect x="50" y="117" width="350" height="6" fill="url(#conveyor-track)" rx="3" />
            <line x1="50" y1="120" x2="400" y2="120" stroke="#475569" strokeWidth="1" strokeDasharray="5,5" className="animated-conveyor" />
            
            {/* Line 2 Pipe */}
            <rect x="50" y="247" width="350" height="6" fill="#1e293b" rx="2" />
            
            {/* LINE 1 - STATION 1 (CONVEYOR) */}
            <g className={`machine-node ${activeMachineId === "LINE1_STN1" ? "active" : ""} health-${getMachineHealth("LINE1_STN1")}`} onClick={() => setActiveMachineId("LINE1_STN1")}>
              <rect x="70" y="80" width="100" height="60" rx="10" className="machine-node-bg" />
              <text x="120" y="98" textAnchor="middle" className="machine-node-text">L1 CONVEYOR</text>
              <text x="120" y="108" textAnchor="middle" className="machine-node-sub">LINE1_STN1</text>
              <text x="120" y="128" textAnchor="middle" className="machine-node-val">
                {telemetry.LINE1_STN1 ? `${telemetry.LINE1_STN1.belt_speed.toFixed(0)} items/m` : "OFFLINE"}
              </text>
              
              {/* Conveyor mini-graphic */}
              <circle cx="85" cy="120" r="4" fill="#64748b" />
              <circle cx="155" cy="120" r="4" fill="#64748b" />
            </g>

            {/* LINE 1 - STATION 2 (LABELER) */}
            <g className={`machine-node ${activeMachineId === "LINE1_STN2" ? "active" : ""} health-${getMachineHealth("LINE1_STN2")}`} onClick={() => setActiveMachineId("LINE1_STN2")}>
              <rect x="230" y="80" width="100" height="60" rx="10" className="machine-node-bg" />
              <text x="280" y="98" textAnchor="middle" className="machine-node-text">L1 LABELER</text>
              <text x="280" y="108" textAnchor="middle" className="machine-node-sub">LINE1_STN2</text>
              <text x="280" y="128" textAnchor="middle" className="machine-node-val">
                {telemetry.LINE1_STN2 ? `${telemetry.LINE1_STN2.temp_ds.toFixed(1)}°C` : "OFFLINE"}
              </text>
              
              {/* Labeler pneumatic head graphic */}
              <rect x="275" y="60" width="10" height="20" fill="#475569" />
              <rect x="270" y="76" width="20" height="4" fill="#94a3b8" className="animated-piston" />
            </g>

            {/* LINE 2 - STATION 1 (FILLER) */}
            <g className={`machine-node ${activeMachineId === "LINE2_STN1" ? "active" : ""} health-${getMachineHealth("LINE2_STN1")}`} onClick={() => setActiveMachineId("LINE2_STN1")}>
              <rect x="70" y="210" width="100" height="60" rx="10" className="machine-node-bg" />
              <text x="120" y="228" textAnchor="middle" className="machine-node-text">L2 FILLER</text>
              <text x="120" y="238" textAnchor="middle" className="machine-node-sub">LINE2_STN1</text>
              <text x="120" y="258" textAnchor="middle" className="machine-node-val">
                {telemetry.LINE2_STN1 ? `${telemetry.LINE2_STN1.temp_ds.toFixed(1)}°C` : "OFFLINE"}
              </text>
              
              {/* Tank liquid drop graphic */}
              <circle cx="120" cy="190" r="10" fill="none" stroke="#475569" strokeWidth="2" />
              <line x1="120" y1="200" x2="120" y2="210" stroke="#64748b" strokeWidth="2" />
              <circle cx="120" cy="205" r="2.5" className="animated-valve-drop" />
            </g>

            {/* LINE 2 - STATION 2 (SEALER) */}
            <g className={`machine-node ${activeMachineId === "LINE2_STN2" ? "active" : ""} health-${getMachineHealth("LINE2_STN2")}`} onClick={() => setActiveMachineId("LINE2_STN2")}>
              <rect x="230" y="210" width="100" height="60" rx="10" className="machine-node-bg" />
              <text x="280" y="228" textAnchor="middle" className="machine-node-text">L2 SEALER</text>
              <text x="280" y="238" textAnchor="middle" className="machine-node-sub">LINE2_STN2</text>
              <text x="280" y="258" textAnchor="middle" className="machine-node-val">
                {telemetry.LINE2_STN2 ? `${telemetry.LINE2_STN2.vibration.toFixed(2)} m/s²` : "OFFLINE"}
              </text>
              
              {/* Sealer graphic */}
              <rect x="268" y="195" width="24" height="15" fill="#334155" />
              <line x1="280" y1="202" x2="280" y2="210" stroke="#cbd5e1" strokeWidth="3" className="animated-piston" />
            </g>

            {/* HUD annotations */}
            <g transform="translate(420, 60)">
              {/* Box flow line visual indicator */}
              <rect x="0" y="0" width="12" height="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
              <text x="22" y="10" fill="#94a3b8" fontSize="10" fontWeight="600">Material Conveyor (L1)</text>

              <rect x="0" y="20" width="12" height="12" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
              <text x="22" y="30" fill="#94a3b8" fontSize="10" fontWeight="600">Fluid Conduit (L2)</text>

              <circle cx="6" cy="48" r="6" fill="#10b981" />
              <text x="22" y="51" fill="#94a3b8" fontSize="10">Operational Station OK</text>

              <circle cx="6" cy="68" r="6" fill="#f59e0b" />
              <text x="22" y="71" fill="#94a3b8" fontSize="10">Warning Anomaly Limit</text>

              <circle cx="6" cy="88" r="6" fill="#ef4444" />
              <text x="22" y="91" fill="#94a3b8" fontSize="10">Critical Fault / Tripped E-Stop</text>
            </g>
          </svg>
        </div>

        {/* Side Panel Inspector console */}
        <div className="scada-inspector">
          <div className="inspector-header">
            <h2 className="inspector-title">{MACHINES.find(m => m.id === activeMachineId)?.label || activeMachineId}</h2>
            <span className="inspector-subtitle">ID: {activeMachineId} &bull; SCADA OVERRIDE</span>
          </div>

          {/* Dials for Telemetry */}
          <div className="scada-gauges">
            {/* Temperature Gauge */}
            <div className="scada-gauge-box">
              <div className="gauge-number">
                {activeMachineData ? `${activeMachineData.temp_ds.toFixed(0)}°` : "—"}
              </div>
              <svg className="gauge-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="gauge-bg" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  className="gauge-value-arc"
                  stroke={activeMachineData && activeMachineData.temp_ds > 70 ? "#ef4444" : activeMachineData && activeMachineData.temp_ds > 55 ? "#f59e0b" : "#10b981"}
                  strokeDasharray={`${activeMachineData ? (Math.min(activeMachineData.temp_ds, 100) / 100) * 251.2 : 0} 251.2`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="gauge-label">Temperature</div>
            </div>

            {/* Speed Gauge */}
            <div className="scada-gauge-box">
              <div className="gauge-number">
                {activeMachineData ? `${activeMachineData.belt_speed.toFixed(0)}` : "—"}
              </div>
              <svg className="gauge-svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="gauge-bg" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  className="gauge-value-arc"
                  stroke={activeMachineData && activeMachineData.belt_speed < 70 && activeMachineData.belt_speed > 0 ? "#f59e0b" : activeMachineData && activeMachineData.belt_speed === 0 ? "#ef4444" : "#0284c7"}
                  strokeDasharray={`${activeMachineData ? (Math.min(activeMachineData.belt_speed, 200) / 200) * 251.2 : 0} 251.2`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="gauge-label">Speed (items/m)</div>
            </div>
          </div>

          {/* Vibration Waveform simulation */}
          <div className="vibration-panel">
            <div className="vibe-wave-header">
              <span>VIBRATION SENSOR LEVEL</span>
              <span style={{ color: activeMachineData && activeMachineData.vibration > 5 ? "#f59e0b" : "#10b981", fontWeight: "bold" }}>
                {activeMachineData ? `${activeMachineData.vibration.toFixed(2)} m/s²` : "OFFLINE"}
              </span>
            </div>
            <div className="vibe-wave-wrap">
              <svg className="vibe-sine-wave" viewBox="0 0 300 48">
                {/* Generate simulated live wave based on vibration rating */}
                <path 
                  d={(() => {
                    const vib = activeMachineData ? activeMachineData.vibration : 1.0;
                    const amp = Math.min(vib * 2, 20); // wave height
                    const freq = Math.min(vib * 1.5, 12); // wave cycle speed
                    let points = [];
                    for (let i = 0; i <= 300; i += 2) {
                      const y = 24 + Math.sin(i * (freq / 100)) * amp;
                      points.push(`${i},${y}`);
                    }
                    return `M ${points.join(" L ")}`;
                  })()} 
                />
              </svg>
            </div>
          </div>

          {/* Machine RCA Findings Panel */}
          <div className="scada-controls" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3 className="controls-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Machine RCA Findings</span>
              <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#334155", color: "#f1f5f9" }}>
                {rcaFindings.length} Events
              </span>
            </h3>
            <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {rcaFindings.length === 0 ? (
                <div style={{ fontSize: "11px", color: "#475569", fontStyle: "italic", padding: "8px 0" }}>
                  No RCA findings for this machine.
                </div>
              ) : (
                rcaFindings.map((finding) => (
                  <div key={finding.id} style={{
                    backgroundColor: "rgba(30, 41, 59, 0.4)",
                    border: "1px solid #1e293b",
                    borderLeft: `3px solid ${{ high: "#ef4444", medium: "#f59e0b", low: "#10b981" }[finding.severity] || "#64748b"}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: "8px", fontWeight: "bold", padding: "1px 4px", borderRadius: "3px",
                        backgroundColor: { high: "rgba(239,68,68,0.12)", medium: "rgba(245,158,11,0.12)", low: "rgba(16,185,129,0.12)" }[finding.severity] || "#1e293b",
                        color: { high: "#ef4444", medium: "#f59e0b", low: "#10b981" }[finding.severity] || "#94a3b8"
                      }}>
                        {finding.severity.toUpperCase()}
                      </span>
                      <span style={{ color: "#475569", fontSize: "9px" }}>
                        {new Date(finding.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#f1f5f9" }}>{finding.problem}</div>
                    <div style={{ color: "#94a3b8" }}>Root Cause: {finding.cause}</div>
                    <div style={{ color: "#38bdf8" }}>Mitigation: {finding.action}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MQTT raw packet logs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div className="gauge-label" style={{ textAlign: "left" }}>Live PLC telemetry buffer</div>
            <div className="scada-console">
              {activeMachinePackets.length === 0 ? (
                <div className="console-row" style={{ color: "#475569" }}>Waiting for machine telemetry stream...</div>
              ) : (
                activeMachinePackets.map((p, idx) => (
                  <div key={idx} className="console-row">
                    [{new Date(p.timestamp).toLocaleTimeString()}] cycle={p.cycle} | temp={p.temp_ds.toFixed(1)}°C vib={p.vibration.toFixed(2)} speed={p.belt_speed.toFixed(0)} fault={p.fault || "NONE"}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alarms and Events logger */}
      <div className="scada-alarms">
        <div className="alarms-title-bar">
          <h3>Active Alarms & Event Logs</h3>
          {alarms.filter(a => a.severity !== "resolved").length > 0 && (
            <span className="alarm-count-badge">
              {alarms.filter(a => a.severity !== "resolved").length} active
            </span>
          )}
        </div>
        <div className="alarms-list">
          {alarms.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#475569" }}>All systems normal. No active alarms.</div>
          ) : (
            alarms.map((alarm) => (
              <div key={alarm.id} className={`alarm-item ${alarm.severity}`}>
                <span className="alarm-time">[{alarm.timestamp}]</span>
                <span className="alarm-node">{alarm.machineId}</span>
                <span className="alarm-msg">{alarm.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
