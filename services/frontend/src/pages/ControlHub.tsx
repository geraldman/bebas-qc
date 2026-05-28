interface ControlHubProps {
  navigate: (to: string) => void;
}

export default function ControlHub({ navigate }: ControlHubProps) {
  return (
    <div className="hub-container">
      <div className="glow-circle glow-circle-1" />
      <div className="glow-circle glow-circle-2" />
      
      <header className="hub-header">
        <div className="hub-badge">SMARTVISION RCA</div>
        <h1 className="hub-title">
          BEBAS QC <span className="title-gradient">Control Hub</span>
        </h1>
        <p className="hub-subtitle">
          AI-powered root cause analysis for manufacturing. Detect anomalies, identify failure causes, and receive corrective action recommendations in real-time.
        </p>
      </header>
 
      <main className="hub-grid">
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
            Live telemetry from all machines — temperature, vibration, belt speed, humidity. AI camera integration with real-time defect detection via Roboflow.
          </p>
          <span className="hub-card-btn font-semibold">Open Dashboard →</span>
        </button>
 
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
            Full audit trail of all anomalies detected by the AI engine. View root causes, evidence, and recommended corrective actions — filterable by machine and severity.
          </p>
          <span className="hub-card-btn font-semibold" style={{ color: "#6366f1" }}>View RCA Log →</span>
        </button>

        <a 
          href="/simulator"
          target="bebasqc_simulator"
          rel="noopener noreferrer"
          className="hub-card"
          style={{ opacity: 0.85 }}
        >
          <div className="hub-card-icon-wrap bg-orange-grad">
            <svg className="hub-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <h2 className="hub-card-title">IoT Simulator <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>DEV</span></h2>
          <p className="hub-card-desc">
            Publish simulated MQTT sensor payloads to test the RCA pipeline. Trigger fault conditions to validate anomaly detection thresholds.
          </p>
          <span className="hub-card-btn font-semibold">Launch Simulator →</span>
        </a>
      </main>

      <footer className="hub-footer">
        <p>Bebas QC Systems &copy; {new Date().getFullYear()} &bull; AI-Driven Industrial Root Cause Analysis</p>
      </footer>
    </div>
  );
}
