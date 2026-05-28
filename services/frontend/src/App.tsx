import { useEffect, useState } from "react";
import "./App.css";
import ControlHub from "./pages/ControlHub";
import Dashboard from "./pages/Dashboard";
import Simulator from "./pages/Simulator";
import InspectMachine from "./pages/InspectMachine";
import RCALog from "./pages/RCALog";
import { SimulatorProvider, useSimulator } from "./SimulatorContext";

// Persistent session: generate a stable container ID once and store it forever.
function getOrCreateContainerId(): string {
  const stored = localStorage.getItem("bebasqc_container_id");
  if (stored) return stored;
  const newId = "bebasqc-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  localStorage.setItem("bebasqc_container_id", newId);
  return newId;
}

// ─── Global Simulator Drawer ───────────────────────────────────────────────
// Rendered once at the App level so it stays mounted across all route changes.
// The Simulator's MQTT client and running state are never destroyed by navigation.
function GlobalSimulatorDrawer({ containerId }: { containerId: string }) {
  const { isOpen, closeSimulator } = useSimulator();
  return (
    <div
      className={`sim-drawer-overlay ${isOpen ? "open" : ""}`}
      onClick={closeSimulator}
    >
      <div className="sim-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sim-drawer-header">
          <h3>IoT Edge Sensor Simulator</h3>
          <button type="button" className="sim-drawer-close" onClick={closeSimulator}>
            ✕ Close
          </button>
        </div>
        <div className="sim-drawer-body">
          {/* Always mounted — state persists across page changes */}
          <Simulator containerId={containerId} isOverlay={true} />
        </div>
      </div>
    </div>
  );
}

// ─── App inner (needs access to SimulatorContext) ──────────────────────────
function AppInner() {
  const [path, setPath] = useState(window.location.pathname);
  const [containerId, setContainerId] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlContainerId = params.get("containerId");
    if (urlContainerId) {
      localStorage.setItem("bebasqc_container_id", urlContainerId);
      setContainerId(urlContainerId);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      setContainerId(getOrCreateContainerId());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setPath(newPath);
  };

  if (!ready) {
    return (
      <div className="prov-container">
        <div className="prov-card" style={{ padding: "40px 32px", maxWidth: "360px", textAlign: "center" }}>
          <div className="prov-spinner-wrap" style={{ margin: "0 auto 20px" }}>
            <div className="prov-spinner"></div>
            <div className="prov-spinner-inner"></div>
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#0f172a", margin: "0 0 8px" }}>Initializing</h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Loading Bebas QC...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (path === "/dashboard") return <Dashboard navigate={navigate} containerId={containerId} />;
    if (path === "/inspect") return <InspectMachine navigate={navigate} containerId={containerId} />;
    if (path === "/rca") return <RCALog navigate={navigate} />;
    return <ControlHub navigate={navigate} />;
  };

  return (
    <>
      {renderPage()}
      {/* Single persistent Simulator drawer — survives all route changes */}
      <GlobalSimulatorDrawer containerId={containerId} />
    </>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────
function App() {
  return (
    <SimulatorProvider>
      <AppInner />
    </SimulatorProvider>
  );
}

export default App;
