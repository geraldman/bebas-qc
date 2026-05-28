import { useEffect, useState } from "react";
import "./App.css";
import ControlHub from "./pages/ControlHub";
import Dashboard from "./pages/Dashboard";
import Simulator from "./pages/Simulator";
import InspectMachine from "./pages/InspectMachine";
import RCALog from "./pages/RCALog";

// Persistent session: generate a stable container ID once and store it forever.
// No 15-minute expiry — factory dashboards run 24/7.
function getOrCreateContainerId(): string {
  const stored = localStorage.getItem("bebasqc_container_id");
  if (stored) return stored;
  const newId = "bebasqc-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  localStorage.setItem("bebasqc_container_id", newId);
  return newId;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [containerId, setContainerId] = useState<string>("");
  const [ready, setReady] = useState(false);

  // Initialize session on mount — check URL param first (Telegram link-in), else use stored/new ID
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

  // Routing — listen to browser back/forward
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setPath(newPath);
  };

  // Loading guard — wait for containerId to be resolved from storage
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

  // Route switch
  const renderPage = () => {
    if (path === "/dashboard") return <Dashboard navigate={navigate} containerId={containerId} />;
    if (path === "/simulator") return <Simulator containerId={containerId} />;
    if (path === "/inspect") return <InspectMachine navigate={navigate} containerId={containerId} />;
    if (path === "/rca") return <RCALog navigate={navigate} />;
    return <ControlHub navigate={navigate} />;
  };

  return (
    <>
      {renderPage()}
    </>
  );
}

export default App;
