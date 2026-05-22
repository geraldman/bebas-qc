import { useEffect } from "react";

interface ControlHubProps {
  navigate: (to: string) => void;
}

export default function ControlHub({ navigate }: ControlHubProps) {
  useEffect(() => {
    window.name = "bebasqc_controlhub";
  }, []);

  return (
    <div className="hub-container">
      <div className="glow-circle glow-circle-1" />
      <div className="glow-circle glow-circle-2" />
      
      <header className="hub-header">
        <div className="hub-badge">PROTOTYPE HUB</div>
        <h1 className="hub-title">
          BEBAS QC <span className="title-gradient">Control Hub</span>
        </h1>
        <p className="hub-subtitle">
          An automated, industrial-grade quality control suite. Access real-time line telemetry, machine learning visual defect inspection, or publish simulated hardware sensor feeds.
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
          <h2 className="hub-card-title">QC Monitor Dashboard</h2>
          <p className="hub-card-desc">
            View live telemetry streams (Temperature, Humidity, Vibration, Belt Speed) for lines and station nodes. Real-time edge camera integration with automated ML-driven product defect prediction.
          </p>
          <span className="hub-card-btn font-semibold">Open Dashboard →</span>
        </button>
 
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
          <h2 className="hub-card-title">MQTT IoT Simulator</h2>
          <p className="hub-card-desc">
            Emulate edge devices on production lines. Set parameters, configure vibration spikes or heat surges, and test how the backend broker routes alerts and vision signals dynamically.
          </p>
          <span className="hub-card-btn font-semibold">Launch Simulator →</span>
        </a>
      </main>

      <footer className="hub-footer">
        <p>Bebas QC Systems &copy; {new Date().getFullYear()} &bull; Industrial Edge Intelligence</p>
      </footer>
    </div>
  );
}
