import { useEffect, useState } from "react";

interface ControlHubProps {
  navigate: (to: string) => void;
}

export default function ControlHub({ navigate }: ControlHubProps) {
  const [containerId, setContainerId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("bebasqc_container_id");
    if (stored) {
      setContainerId(stored);
    }
  }, []);

  return (
    <div className="hub-container">
      {/* Grid Overlay & Glow Elements */}
      <div className="hub-grid-pattern" />
      <div className="glow-circle glow-circle-1" />
      <div className="glow-circle glow-circle-2" />
      
      {/* Top Session Status Bar */}
      <div className="hub-status-bar">
        <div className="hub-status-item">
          <span className="hub-status-dot glow-green"></span>
          <span className="hub-status-label">SYSTEM ONLINE</span>
        </div>
        {containerId && (
          <div className="hub-status-item">
            <span className="hub-status-label">SESSION:</span>
            <code className="hub-session-code">{containerId}</code>
          </div>
        )}
      </div>

      {/* Header / Hero Section */}
      <header className="hub-header">
        <div className="hub-badge">AI-Powered Industrial Autonomy</div>
        <h1 className="hub-title">
          BEBAS QC <span className="title-gradient">Systems</span>
        </h1>
        <p className="hub-subtitle">
          Real-time Edge Intelligence and Automated Root Cause Analysis for High-Speed Assembly Lines.
        </p>
      </header>

      {/* Challenge & Solution Story Block */}
      <section className="story-section">
        {/* The Challenge Card */}
        <div className="story-card challenge-card">
          <div className="story-card-header">
            <div className="story-icon-wrap icon-red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3>The Manufacturing Challenge</h3>
          </div>
          <div className="story-content">
            <p>
              Traditional assembly lines lose up to <strong>8% of throughput</strong> due to undetected process deviations. When a defect occurs:
            </p>
            <ul>
              <li>
                <strong>Manual RCA Latency:</strong> Diagnostic troubleshooting takes hours, leading to thousands of wasted products.
              </li>
              <li>
                <strong>Compounding Asset Damage:</strong> Hidden mechanical anomalies (like mounting plate vibrations) go unresolved, leading to machine failure.
              </li>
              <li>
                <strong>Information Silos:</strong> Live PLC sensor logs and camera inspection feeds are rarely correlated automatically.
              </li>
            </ul>
          </div>
        </div>

        {/* The Solution Card */}
        <div className="story-card solution-card">
          <div className="story-card-header">
            <div className="story-icon-wrap icon-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h3>The Bebas QC Solution</h3>
          </div>
          <div className="story-content">
            <p>
              Bebas QC combines <strong>IoT telemetry pipelines</strong> with <strong>Edge Computer Vision</strong> to deliver an automated, closed-loop diagnostic framework:
            </p>
            <ul>
              <li>
                <strong>Instant Defect Mapping:</strong> Roboflow AI models continuously screen products and detect surface abnormalities in real-time.
              </li>
              <li>
                <strong>Multi-Sensor Fusion:</strong> A Go backend consumes high-frequency temperature, speed, and vibration data via MQTT.
              </li>
              <li>
                <strong>Automated Diagnostic Engine:</strong> Algorithms correlate physical telemetry anomalies directly with vision faults to pinpoint the root cause (e.g. heating element wear, stamp stroke failure) and send push alerts.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Animated SVG Schematic / Data Topology */}
      <section className="topology-section">
        <h3 className="topology-title">System Architecture & Diagnostic Flow</h3>
        <p className="topology-subtitle">Observe how telemetry streams, vision feeds, and Go endpoints synchronize to automate RCA notifications.</p>
        <div className="topology-container">
          <svg className="topology-svg" viewBox="0 0 800 240">
            {/* Definitions for arrow markers and gradients */}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
              </marker>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Connecting lines */}
            <path d="M 110 70 L 250 70" stroke="#1e293b" strokeWidth="2" />
            <path d="M 110 170 L 250 170" stroke="#1e293b" strokeWidth="2" />
            <path d="M 350 120 L 450 120" stroke="#1e293b" strokeWidth="2" />
            <path d="M 550 120 L 690 120" stroke="#1e293b" strokeWidth="2" />

            {/* Animated Pulses on connecting lines */}
            <circle r="4" fill="#38bdf8" className="topo-pulse-1" />
            <circle r="4" fill="#f43f5e" className="topo-pulse-2" />
            <circle r="4" fill="#10b981" className="topo-pulse-3" />
            <circle r="4" fill="#38bdf8" className="topo-pulse-4" />

            {/* EDGE NODES */}
            {/* Sensor Telemetry Node */}
            <g className="topo-node">
              <rect x="10" y="30" width="100" height="80" rx="8" className="topo-node-bg" />
              <text x="60" y="55" textAnchor="middle" className="topo-node-icon">📡</text>
              <text x="60" y="80" textAnchor="middle" className="topo-node-text">Edge Sensors</text>
              <text x="60" y="95" textAnchor="middle" className="topo-node-sub">Telemetry (MQTT)</text>
            </g>

            {/* Vision Camera Node */}
            <g className="topo-node">
              <rect x="10" y="130" width="100" height="80" rx="8" className="topo-node-bg" />
              <text x="60" y="155" textAnchor="middle" className="topo-node-icon">📹</text>
              <text x="60" y="180" textAnchor="middle" className="topo-node-text">Roboflow Camera</text>
              <text x="60" y="195" textAnchor="middle" className="topo-node-sub">Edge AI Vision</text>
            </g>

            {/* MQTT Broker / HiveMQ Node */}
            <g className="topo-node">
              <rect x="250" y="80" width="100" height="80" rx="8" className="topo-node-bg active-node" />
              <text x="300" y="105" textAnchor="middle" className="topo-node-icon">🐝</text>
              <text x="300" y="130" textAnchor="middle" className="topo-node-text">HiveMQ Broker</text>
              <text x="300" y="145" textAnchor="middle" className="topo-node-sub">MQTT Gateway</text>
            </g>

            {/* Go Diagnostic Engine Node */}
            <g className="topo-node">
              <rect x="450" y="80" width="100" height="80" rx="8" className="topo-node-bg active-node" />
              <text x="500" y="105" textAnchor="middle" className="topo-node-icon">🐹</text>
              <text x="500" y="130" textAnchor="middle" className="topo-node-text">Go Backend</text>
              <text x="500" y="145" textAnchor="middle" className="topo-node-sub">RCA Correlation</text>
            </g>

            {/* Operator Client & Notifications Node */}
            <g className="topo-node">
              <rect x="690" y="80" width="100" height="80" rx="8" className="topo-node-bg" />
              <text x="740" y="105" textAnchor="middle" className="topo-node-icon">📲</text>
              <text x="740" y="130" textAnchor="middle" className="topo-node-text">Telegram Bot</text>
              <text x="740" y="145" textAnchor="middle" className="topo-node-sub">Operator alerts</text>
            </g>
          </svg>
        </div>
      </section>

      {/* Control Center Grid (Action Cards) */}
      <h3 className="grid-heading">Control Center Navigation</h3>
      <main className="hub-grid">
        {/* Production Dashboard Card */}
        <button 
          type="button" 
          className="hub-card" 
          onClick={() => navigate("/dashboard")}
        >
          <div className="hub-card-icon-wrap bg-blue-grad">
            <svg className="hub-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
              <path d="M6 10l3-3 4 4 5-5" />
            </svg>
          </div>
          <h2 className="hub-card-title">Production Dashboard</h2>
          <p className="hub-card-desc">
            Live telemetry stream from all active stations. Access automated charts and the real-time AI camera video inference.
          </p>
          <span className="hub-card-btn">Launch Dashboard →</span>
        </button>
 
        {/* SCADA Machine Inspection */}
        <button
          type="button"
          className="hub-card"
          onClick={() => navigate("/inspect")}
        >
          <div className="hub-card-icon-wrap" style={{ background: "linear-gradient(135deg, #10b981, #047857)" }}>
            <svg className="hub-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <h2 className="hub-card-title">SCADA Machine Inspection</h2>
          <p className="hub-card-desc">
            View animated hardware schematics (Line 1/2 valves, pistons, gear sets), read active sensor gauges, and view diagnostic overrides.
          </p>
          <span className="hub-card-btn" style={{ color: "#10b981" }}>Inspect Stations →</span>
        </button>

        {/* RCA Findings Log Card */}
        <button
          type="button"
          className="hub-card"
          onClick={() => navigate("/rca")}
        >
          <div className="hub-card-icon-wrap" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
            <svg className="hub-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M11 8v3l2 2" />
            </svg>
          </div>
          <h2 className="hub-card-title">RCA Log</h2>
          <p className="hub-card-desc">
            Review the complete audit log of system failures. Investigate problem descriptions, root causes, evidence records, and recommended corrective actions.
          </p>
          <span className="hub-card-btn" style={{ color: "#6366f1" }}>Open RCA Log →</span>
        </button>

        {/* IoT Developer Simulator Card */}
        <a 
          href="/simulator"
          target="bebasqc_simulator"
          rel="noopener noreferrer"
          className="hub-card"
        >
          <div className="hub-card-icon-wrap bg-orange-grad">
            <svg className="hub-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <h2 className="hub-card-title">IoT Simulator <span className="dev-tag">DEV</span></h2>
          <p className="hub-card-desc">
            Publish custom MQTT sensor anomalies (over-temperature, excessive vibrations, belt delays) to trigger and test the automated backend alerts.
          </p>
          <span className="hub-card-btn" style={{ color: "#f97316" }}>Launch Simulator →</span>
        </a>
      </main>

      <footer className="hub-footer">
        <p>Bebas QC Systems &copy; {new Date().getFullYear()} &bull; Industrial Diagnostics & Telemetry Auditing</p>
      </footer>
    </div>
  );
}
