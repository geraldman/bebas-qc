import { useEffect, useState } from "react";
import "./App.css";
import ControlHub from "./pages/ControlHub";
import Dashboard from "./pages/Dashboard";
import Simulator from "./pages/Simulator";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [containerId, setContainerId] = useState<string>("");
  const [provisioning, setProvisioning] = useState<boolean>(false);
  const [provStep, setProvStep] = useState<number>(0);

  // Initialize session from localStorage or show provisioning screen
  useEffect(() => {
    const storedStart = localStorage.getItem("bebasqc_container_start");
    const storedId = localStorage.getItem("bebasqc_container_id");

    if (storedStart && storedId) {
      setSessionStart(Number(storedStart));
      setContainerId(storedId);
    } else {
      setProvisioning(true);
    }
  }, []);

  // Provisioning steps simulation (visual prototype details)
  useEffect(() => {
    if (!provisioning) return;

    const steps = [
      "Requesting new sandbox environment...",
      "Allocating docker resources...",
      "Initializing PostgreSQL schema & seeding data...",
      "Setting up HiveMQ MQTT broker proxy...",
      "Connecting Edge SmartVision model...",
      "Container ready! Launching Control Hub..."
    ];

    const timer = setInterval(() => {
      setProvStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          const newStart = Date.now();
          const newId = "bebasqc-sandbox-" + Math.random().toString(36).substring(2, 6).toUpperCase();
          localStorage.setItem("bebasqc_container_start", String(newStart));
          localStorage.setItem("bebasqc_container_id", newId);
          setSessionStart(newStart);
          setContainerId(newId);
          setProvisioning(false);
          return prev;
        }
        return prev + 1;
      });
    }, 850);

    return () => clearInterval(timer);
  }, [provisioning]);

  // Countdown timer logic
  useEffect(() => {
    if (!sessionStart) return;

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - sessionStart) / 1000);
      const remaining = 15 * 60 - elapsedSeconds;
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  // Routing popstate listener
  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setPath(newPath);
  };

  const handleLaunchNew = () => {
    localStorage.removeItem("bebasqc_container_start");
    localStorage.removeItem("bebasqc_container_id");
    setSessionStart(null);
    setTimeLeft(15 * 60);
    setProvStep(0);
    setProvisioning(true);
    navigate("/");
  };

  // 1. Provisioning screen loading layout
  if (provisioning) {
    const steps = [
      "Requesting new sandbox environment...",
      "Allocating docker resources...",
      "Initializing PostgreSQL schema & seeding data...",
      "Setting up HiveMQ MQTT broker proxy...",
      "Connecting Edge SmartVision model...",
      "Container ready! Launching Control Hub..."
    ];
    return (
      <div className="prov-container">
        <div className="prov-card">
          <div className="prov-spinner-wrap">
            <div className="prov-spinner"></div>
            <div className="prov-spinner-inner"></div>
          </div>
          <h2 className="prov-title">Provisioning Container</h2>
          <p className="prov-subtitle">Spinning up your dedicated prototype environment...</p>
          <div className="prov-steps">
            {steps.map((step, idx) => {
              let statusClass = "step-pending";
              if (idx < provStep) statusClass = "step-done";
              else if (idx === provStep) statusClass = "step-active";
              return (
                <div key={idx} className={`prov-step ${statusClass}`}>
                  <span className="step-icon">
                    {idx < provStep ? "✓" : idx === provStep ? "●" : "○"}
                  </span>
                  <span className="step-text">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Format time remaining MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = timeLeft <= 0;

  // Banner component
  const sessionBanner = (
    <div className={`session-banner ${timeLeft < 60 ? "session-warning" : ""}`}>
      <div className="session-info">
        <span className="session-pulse"></span>
        <span className="session-text">
          Container Active: <code>{containerId}</code>
        </span>
      </div>
      <div className="session-timer">
        Time remaining: <strong>{formatTime(timeLeft)}</strong>
      </div>
    </div>
  );

  return (
    <>
      {!isExpired && sessionBanner}
      {isExpired && (
        <div className="expire-overlay">
          <div className="expire-card">
            <div className="expire-icon-wrap">
              <svg className="expire-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="expire-title">Session Expired</h2>
            <p className="expire-desc">
              Your 15-minute personalized container sandbox has reached its limit and has been destroyed to save prototype resources.
            </p>
            <button className="btn" style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff", width: "100%" }} onClick={handleLaunchNew}>
              Launch New Container
            </button>
          </div>
        </div>
      )}
      {!isExpired && (
        path === "/dashboard" ? (
          <Dashboard navigate={navigate} containerId={containerId} />
        ) : path === "/simulator" ? (
          <Simulator navigate={navigate} containerId={containerId} />
        ) : (
          <ControlHub navigate={navigate} />
        )
      )}
    </>
  );
}

export default App;
