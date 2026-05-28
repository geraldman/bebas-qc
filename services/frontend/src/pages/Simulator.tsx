import { useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";

interface SimulatorProps {
  containerId: string;
  isOverlay?: boolean;
}

interface MachineState {
  temperature: number;
  humidity: number;
  vibration: number;
  belt_speed: number;
  fault: string | null;
}

const isLocalDev = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1" || 
                    (window.location.port !== "" && window.location.port !== "80" && window.location.port !== "443");
const MQTT_URL = import.meta.env.VITE_MQTT_URL || (
  isLocalDev
    ? `ws://${window.location.hostname}:8000/mqtt`
    : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/mqtt`
);

const MACHINES = [
  {
    id: "LINE1_STN1",
    label: "Line 1 — Conveyor",
    topic_suffix: "line1/station1/sensors",
    defaults: { temperature: 49.5, humidity: 60.0, vibration: 2.35, belt_speed: 110.0 },
  },
  {
    id: "LINE1_STN2",
    label: "Line 1 — Labeler",
    topic_suffix: "line1/station2/sensors",
    defaults: { temperature: 49.5, humidity: 60.0, vibration: 2.35, belt_speed: 110.0 },
  },
  {
    id: "LINE2_STN1",
    label: "Line 2 — Filler",
    topic_suffix: "line2/station1/sensors",
    defaults: { temperature: 49.5, humidity: 60.0, vibration: 2.35, belt_speed: 110.0 },
  },
  {
    id: "LINE2_STN2",
    label: "Line 2 — Sealer",
    topic_suffix: "line2/station2/sensors",
    defaults: { temperature: 49.5, humidity: 60.0, vibration: 2.35, belt_speed: 110.0 },
  },
];

const FAULTS = ["high_vibration", "overheating", "speed_drop", "label_misalign"];

const DRIFT_RANGE = {
  temperature: 1.2,
  humidity: 2.0,
  vibration: 0.08,
  belt_speed: 2.0,
};

const THRESHOLDS = {
  machine_temp: { warn: 55, critical: 70 },
  vibration: { warn: 5, critical: 8 },
  humidity: { warn: 80 },
  belt_speed: { min: 70 },
};

const NORMAL_BOUNDS = {
  temperature: [45, THRESHOLDS.machine_temp.warn - 1],
  humidity: [45, THRESHOLDS.humidity.warn - 5],
  vibration: [0.2, THRESHOLDS.vibration.warn - 0.5],
  belt_speed: [THRESHOLDS.belt_speed.min + 10, 140],
};

function getSensorBounds(sensor: "temperature" | "humidity" | "vibration" | "belt_speed", fault: string | null) {
  const SLIDER_LIMITS = {
    temperature: [30, 120],
    humidity: [20, 100],
    vibration: [0, 12],
    belt_speed: [50, 200],
  };

  const [min, max] = SLIDER_LIMITS[sensor];

  if (fault === "overheating" && sensor === "temperature") {
    return [Math.max(THRESHOLDS.machine_temp.critical + 5, min), max];
  }
  if (fault === "high_vibration" && sensor === "vibration") {
    return [Math.max(THRESHOLDS.vibration.critical + 0.3, min), max];
  }
  if (fault === "speed_drop" && sensor === "belt_speed") {
    return [min, Math.min(THRESHOLDS.belt_speed.min - 5, max)];
  }

  const normal = NORMAL_BOUNDS[sensor];
  if (normal) {
    return [Math.max(normal[0], min), Math.min(normal[1], max)];
  }

  return [min, max];
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
const randInRange = (range: number) => (Math.random() * 2 - 1) * range;

export default function Simulator({ containerId, isOverlay = false }: SimulatorProps) {
  const [connected, setConnected] = useState(false);
  const [publishing, setPublishing] = useState(true);
  const [publishInterval, setPublishInterval] = useState(2000);
  const [logs, setLogs] = useState<Array<{ time: string; msg: string; type: string }>>([]);
  const [cliInput, setCliInput] = useState("");
  const [activityPaused, setActivityPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  const lastInteractionRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());

  const [machineData, setMachineData] = useState<Record<string, MachineState>>(() => {
    const init: Record<string, MachineState> = {};
    MACHINES.forEach((m) => {
      init[m.id] = {
        temperature: m.defaults.temperature,
        humidity: m.defaults.humidity,
        vibration: m.defaults.vibration,
        belt_speed: m.defaults.belt_speed,
        fault: null,
      };
    });
    return init;
  });

  const clientRef = useRef<MqttClient | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const cycleRef = useRef<number>(0);
  const publishingRef = useRef<boolean>(false);
  const intervalIdRef = useRef<number | null>(null);

  const addLog = (msg: string, type = "") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, msg, type }].slice(-80));
  };

  // Sync ref with state
  useEffect(() => {
    publishingRef.current = publishing;
  }, [publishing]);

  useEffect(() => {
    window.name = "bebasqc_simulator";
  }, []);

  // Connect to MQTT Broker
  useEffect(() => {
    addLog(`Connecting to MQTT broker at ${MQTT_URL}...`, "info");
    const client = mqtt.connect(MQTT_URL, {
      clientId: `bebasqc_simulator_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 2500,
    });
    clientRef.current = client;

    client.on("connect", () => {
      setConnected(true);
      addLog(`Connected successfully. namespace: bebasqc/${containerId}/`, "ok");
    });
    client.on("close", () => {
      setConnected(false);
    });
    client.on("error", (err) => {
      addLog(`Broker connection error: ${err.message}`, "warn");
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
      setConnected(false);
    };
  }, [containerId]);

  const cliInputRef = useRef<HTMLInputElement | null>(null);

  // Focus CLI input on mount
  useEffect(() => {
    if (cliInputRef.current) {
      cliInputRef.current.focus();
    }
  }, []);

  const handleLogContainerClick = () => {
    if (cliInputRef.current) {
      cliInputRef.current.focus();
    }
  };

  const handleCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmdStr = cliInput.trim();
    if (!cmdStr) return;

    // Add command to log
    addLog(`> ${cmdStr}`, "info");
    setCliInput("");

    const parts = cmdStr.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case "help":
        addLog("Available commands:", "info");
        addLog("  pub <suffix> <json> - Publish JSON payload to bebasqc/<containerId>/<suffix>", "info");
        addLog("  fault <machine_id> <type> - Inject fault (high_vibration, overheating, speed_drop, label_misalign)", "info");
        addLog("  clear <machine_id> - Clear active fault for machine", "info");
        addLog("  start - Start auto-publishing", "info");
        addLog("  stop - Stop auto-publishing", "info");
        addLog("  rate <ms> - Set auto-publish interval", "info");
        addLog("  cls / clear-log - Clear log display", "info");
        break;

      case "cls":
      case "clear-log":
        setLogs([]);
        break;

      case "start":
        setPublishing(true);
        break;

      case "stop":
        setPublishing(false);
        break;

      case "rate": {
        const ms = parseInt(args[0]);
        if (isNaN(ms) || ms < 500) {
          addLog("Error: rate must be a number >= 500ms", "warn");
        } else {
          setPublishInterval(ms);
          addLog(`Publish rate set to ${ms}ms`, "ok");
        }
        break;
      }

      case "fault": {
        const mId = (args[0] || "").toUpperCase();
        const fType = args[1]?.toLowerCase();
        const machine = MACHINES.find(m => m.id === mId);
        if (!machine) {
          addLog(`Error: Machine '${mId}' not found. Valid IDs: ${MACHINES.map(m => m.id).join(", ")}`, "warn");
        } else if (!FAULTS.includes(fType)) {
          addLog(`Error: Fault '${fType}' invalid. Valid types: ${FAULTS.join(", ")}`, "warn");
        } else {
          handleToggleFault(mId, fType);
        }
        break;
      }

      case "clear": {
        const mId = (args[0] || "").toUpperCase();
        const machine = MACHINES.find(m => m.id === mId);
        if (!machine) {
          addLog(`Error: Machine '${mId}' not found. Valid IDs: ${MACHINES.map(m => m.id).join(", ")}`, "warn");
        } else {
          handleToggleFault(mId, null);
        }
        break;
      }

      case "pub": {
        if (args.length < 2) {
          addLog("Error: Use format 'pub <topic_suffix> <json_payload>'", "warn");
          break;
        }
        const suffix = args[0];
        const rawJson = args.slice(1).join(" ");
        try {
          const parsed = JSON.parse(rawJson);
          if (!clientRef.current || !clientRef.current.connected) {
            addLog("Error: MQTT client is disconnected", "warn");
            break;
          }
          const topic = containerId ? `bebasqc/${containerId}/${suffix}` : `bebasqc/${suffix}`;
          clientRef.current.publish(topic, JSON.stringify(parsed), { qos: 1 });
          addLog(`Published to ${topic}: ${JSON.stringify(parsed)}`, "ok");
        } catch (err: any) {
          addLog(`Error parsing JSON: ${err.message}`, "warn");
        }
        break;
      }

      default:
        addLog(`Unknown command: '${command}'. Type 'help' for details.`, "warn");
    }

    // Scroll to bottom on user CLI action
    setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  // Telemetry drift simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setMachineData((prev) => {
        const next = { ...prev };
        MACHINES.forEach((m) => {
          const state = next[m.id];
          if (!state) return;
          const fault = state.fault;

          const [tempMin, tempMax] = getSensorBounds("temperature", fault);
          const [humMin, humMax] = getSensorBounds("humidity", fault);
          const [vibMin, vibMax] = getSensorBounds("vibration", fault);
          const [speedMin, speedMax] = getSensorBounds("belt_speed", fault);

          next[m.id] = {
            ...state,
            temperature: clamp(state.temperature + randInRange(DRIFT_RANGE.temperature), tempMin, tempMax),
            humidity: clamp(state.humidity + randInRange(DRIFT_RANGE.humidity), humMin, humMax),
            vibration: clamp(state.vibration + randInRange(DRIFT_RANGE.vibration), vibMin, vibMax),
            belt_speed: clamp(state.belt_speed + randInRange(DRIFT_RANGE.belt_speed), speedMin, speedMax),
          };
        });
        return next;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  const buildPayload = (machineId: string, state: MachineState) => {
    let temperature = state.temperature;
    let humidity = state.humidity;
    let vibration = state.vibration;
    let belt_speed = state.belt_speed;
    let fault = state.fault;
    let defects = 0;

    if (fault === "high_vibration") {
      vibration = THRESHOLDS.vibration.critical + 0.5 + Math.random();
      defects = Math.ceil(Math.random() * 3);
    }
    if (fault === "overheating") {
      temperature = THRESHOLDS.machine_temp.critical + 5 + Math.random() * 10;
      defects = Math.ceil(Math.random() * 2);
    }
    if (fault === "speed_drop") {
      belt_speed = Math.max(20, THRESHOLDS.belt_speed.min - 10 - Math.random() * 10);
      defects = Math.ceil(Math.random() * 4);
    }
    if (fault === "label_misalign") {
      defects = Math.ceil(Math.random() * 3);
    }

    const machine = MACHINES.find((m) => m.id === machineId);
    const label = machine ? machine.label : "Machine";

    cycleRef.current += 1;

    return {
      machine_id: machineId,
      machine_type: label.split("—")[1]?.trim().toLowerCase() || "unknown",
      temp_dht: parseFloat((temperature - 12 + Math.random() * 4).toFixed(2)),
      temp_ds: parseFloat(temperature.toFixed(2)),
      humidity: parseFloat(humidity.toFixed(2)),
      vibration: parseFloat(vibration.toFixed(3)),
      belt_speed: parseFloat(belt_speed.toFixed(1)),
      defect_count: defects,
      fault: fault || null,
      timestamp: new Date().toISOString(),
      cycle: cycleRef.current,
    };
  };

  const publishAll = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      addLog("Cannot publish: Not connected to MQTT broker", "warn");
      return;
    }

    MACHINES.forEach((machine) => {
      setMachineData((prev) => {
        const state = prev[machine.id];
        if (!state) return prev;
        const payload = buildPayload(machine.id, state);
        const topic = containerId
          ? `bebasqc/${containerId}/${machine.topic_suffix}`
          : `bebasqc/${machine.topic_suffix}`;

        clientRef.current?.publish(topic, JSON.stringify(payload), { qos: 1 });

        const status = payload.fault ? "fault" : "ok";
        const label = payload.fault ? `[FAULT: ${payload.fault}]` : "[OK]";
        addLog(
          `${label} ${machine.id} | temp=${payload.temp_ds}°C ` +
          `vib=${payload.vibration} speed=${payload.belt_speed} ` +
          `defects=${payload.defect_count}`,
          status
        );
        return prev;
      });
    });
  };

  const isPublishingActive = publishing && !activityPaused;

  // Manage auto publish interval
  useEffect(() => {
    if (isPublishingActive) {
      intervalIdRef.current = window.setInterval(publishAll, publishInterval);
      addLog(`Auto-publishing active (every ${publishInterval}ms)`, "info");
    } else {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        if (activityPaused) {
          addLog(`Auto-publishing suspended (${pauseReason})`, "warn");
        } else {
          addLog("Auto-publishing stopped", "info");
        }
      }
    }

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [isPublishingActive, publishInterval, activityPaused, pauseReason]);

  // Inactivity, Visibility & Session Duration Optimization
  useEffect(() => {
    // 1. User Interaction Listeners to reset idle state
    const resetIdle = () => {
      lastInteractionRef.current = Date.now();
      setActivityPaused((prev) => {
        if (prev && pauseReason === "user inactivity") {
          addLog("User activity detected. Resuming simulation.", "info");
          return false;
        }
        return prev;
      });
    };

    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("mousedown", resetIdle);
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("scroll", resetIdle);
    window.addEventListener("click", resetIdle);

    // 2. Visibility Listener (tab focus/blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setActivityPaused(true);
        setPauseReason("tab backgrounded");
        addLog("Tab hidden. Suspending simulation to save compute.", "warn");
      } else {
        setActivityPaused((prev) => {
          if (prev && pauseReason === "tab backgrounded") {
            addLog("Tab visible. Resuming simulation.", "info");
            return false;
          }
          return prev;
        });
        lastInteractionRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Polling check for idle and session limit (every 1 second)
    const checkTimer = setInterval(() => {
      const now = Date.now();
      
      if (publishing && !activityPaused) {
        // A. Check for 5-minute inactivity (300,000 ms)
        const idleDuration = now - lastInteractionRef.current;
        if (idleDuration >= 300000) {
          setActivityPaused(true);
          setPauseReason("user inactivity");
          addLog("Simulation suspended due to 5 minutes of user inactivity.", "warn");
        }

        // B. Check for 30-minute session cap (1,800,000 ms)
        const activeDuration = now - sessionStartRef.current;
        if (activeDuration >= 1800000) {
          setPublishing(false);
          setActivityPaused(true);
          setPauseReason("session time limit");
          addLog("Simulation stopped: 30-minute continuous run safety cap reached.", "warn");
        }
      }
    }, 1000);

    if (publishing) {
      sessionStartRef.current = Date.now();
    }

    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("mousedown", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("scroll", resetIdle);
      window.removeEventListener("click", resetIdle);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(checkTimer);
    };
  }, [publishing, activityPaused, pauseReason]);

  const handleToggleFault = (machineId: string, fault: string | null) => {
    setMachineData((prev) => {
      const state = prev[machineId];
      if (!state) return prev;
      const updated = { ...state, fault };
      addLog(
        fault
          ? `[FAULT INJECTED] ${machineId} → ${fault.replace(/_/g, " ").toUpperCase()}`
          : `[FAULT CLEARED] ${machineId} → System OK`,
        fault ? "fault" : "ok"
      );
      return { ...prev, [machineId]: updated };
    });
  };

  const handleSliderChange = (
    machineId: string,
    sensor: "temperature" | "humidity" | "vibration" | "belt_speed",
    val: number
  ) => {
    setMachineData((prev) => {
      const state = prev[machineId];
      if (!state) return prev;
      return {
        ...prev,
        [machineId]: {
          ...state,
          [sensor]: val,
        },
      };
    });
  };

  return (
    <div className="simulator-page" style={{ position: "relative" }}>
      {activityPaused && (
        <div className="sim-paused-overlay">
          <div className="sim-paused-card">
            <h4>Simulation Suspended</h4>
            <p>
              Auto-publishing is paused due to {pauseReason} to conserve compute resources.
            </p>
            <button
              type="button"
              className="btn btn-resume"
              onClick={() => {
                setActivityPaused(false);
                lastInteractionRef.current = Date.now();
                sessionStartRef.current = Date.now();
                if (pauseReason === "session time limit") {
                  setPublishing(true);
                }
              }}
            >
              Resume Simulation
            </button>
          </div>
        </div>
      )}
      {!isOverlay && (
        <div className="header-row">
          <div>
            <h2 className="title">IoT Sensor Edge Simulator</h2>
            <p className="subtitle">Publish simulated line and station node telemetry to the sandbox container broker</p>
          </div>
          <div className="header-actions">
            <a href="/" target="bebasqc_controlhub" className="btn btn-outline" style={{ marginRight: "4px" }}>
              ← Control Hub
            </a>
            <a href="/dashboard" target="bebasqc_dashboard" className="btn btn-outline" style={{ marginRight: "4px" }}>
              📊 View QC Dashboard
            </a>
            <div className="source-toggle">
              <span className="label">Broker Status</span>
              <span className={connected ? "status-dot ok" : "status-dot"} />
              <span className="label" style={{ fontWeight: 600 }}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sim-status-banner">
        <div>Broker WebSocket Address: <code>{MQTT_URL}</code></div>
        <div>Active Prefix Path: <code>bebasqc/{containerId}/</code></div>
      </div>

      <div className="sim-console-controls">
        <div className="console-settings-row">
          <div className="interval-control-group">
            <span className="label">Auto-Publish Rate:</span>
            <input
              type="number"
              className="interval-input"
              value={publishInterval}
              min="500"
              max="10000"
              step="500"
              onChange={(e) => setPublishInterval(Math.max(500, parseInt(e.target.value) || 1000))}
            />
            <span className="label">ms</span>
          </div>

          <div className="console-button-group">
            <button
              type="button"
              className={`btn ${publishing ? "btn-stop-pub" : "btn-start-pub"}`}
              onClick={() => setPublishing(!publishing)}
            >
              {publishing ? "■ Stop Auto-Publish" : "▶ Start Auto-Publish"}
            </button>
            <button type="button" className="btn btn-outline" onClick={publishAll}>
              Publish Once (Manual)
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setLogs([])}>
              Clear Log Box
            </button>
          </div>
        </div>

        <div className="sim-log-viewer" onClick={handleLogContainerClick}>
          <div className="log-lines-container">
            {logs.length === 0 ? (
              <div className="log-empty-msg">No active simulator events. Start publishing or type commands below.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`log-line ${log.type}`}>
                  <span className="log-time">[{log.time}]</span> {log.msg}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
          <form onSubmit={handleCliSubmit} className="sim-cli-form">
            <span className="cli-prompt">{containerId || "bebasqc"}&gt;</span>
            <input
              type="text"
              ref={cliInputRef}
              className="sim-cli-input"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              placeholder="type 'help' for commands..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </form>
        </div>
      </div>

      <div className="sim-grid">
        {MACHINES.map((machine) => {
          const state = machineData[machine.id];
          if (!state) return null;
          const isFaulty = state.fault !== null;

          return (
            <div key={machine.id} className={`sim-card ${isFaulty ? "sim-card-alert" : ""}`}>
              <div className="sim-card-header">
                <div>
                  <div className="sim-card-label">{machine.label}</div>
                  <div className="sim-card-id">{machine.id}</div>
                </div>
                <span className={`status-pill ${isFaulty ? "critical" : "ok"}`}>
                  {isFaulty ? state.fault?.replace(/_/g, " ").toUpperCase() : "NORMAL"}
                </span>
              </div>

              <div className="sim-fields">
                <div className="sim-field">
                  <div className="sim-field-label">
                    <span>Machine Temperature</span>
                    <span className="sim-field-value">{state.temperature.toFixed(1)}°C</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="0.5"
                    value={state.temperature}
                    onChange={(e) => handleSliderChange(machine.id, "temperature", parseFloat(e.target.value))}
                  />
                </div>

                <div className="sim-field">
                  <div className="sim-field-label">
                    <span>Humidity</span>
                    <span className="sim-field-value">{state.humidity.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    step="1"
                    value={state.humidity}
                    onChange={(e) => handleSliderChange(machine.id, "humidity", parseFloat(e.target.value))}
                  />
                </div>

                <div className="sim-field">
                  <div className="sim-field-label">
                    <span>Vibration</span>
                    <span className="sim-field-value">{state.vibration.toFixed(2)} m/s²</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.05"
                    value={state.vibration}
                    onChange={(e) => handleSliderChange(machine.id, "vibration", parseFloat(e.target.value))}
                  />
                </div>

                <div className="sim-field">
                  <div className="sim-field-label">
                    <span>Belt Speed</span>
                    <span className="sim-field-value">{state.belt_speed.toFixed(0)} items/min</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="1"
                    value={state.belt_speed}
                    onChange={(e) => handleSliderChange(machine.id, "belt_speed", parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="fault-injection-section">
                <div className="fault-title-mini">Inject Fault Scenario</div>
                <div className="fault-btn-group">
                  <button
                    type="button"
                    className={`fault-pill-btn ${state.fault === null ? "active-none" : ""}`}
                    onClick={() => handleToggleFault(machine.id, null)}
                  >
                    Clear Fault
                  </button>
                  {FAULTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`fault-pill-btn ${state.fault === f ? "active-fault" : ""}`}
                      onClick={() => handleToggleFault(machine.id, f)}
                    >
                      {f.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sim-card-topic">
                Topic: <code>bebasqc/{containerId}/{machine.topic_suffix}</code>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
