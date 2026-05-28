import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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

interface RCALogProps {
  navigate: (to: string) => void;
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const SEVERITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};
const SEVERITY_BG: Record<string, string> = {
  high: "rgba(239,68,68,0.12)",
  medium: "rgba(245,158,11,0.12)",
  low: "rgba(34,197,94,0.12)",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function RCALog({ navigate }: RCALogProps) {
  const [results, setResults] = useState<RCAResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [machineFilter, setMachineFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"" | "high" | "medium" | "low">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"time" | "severity">("time");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchResults = () => {
    const url = `${API_BASE}/api/rca?limit=200${machineFilter ? `&machine_id=${encodeURIComponent(machineFilter)}` : ""}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RCAResult[]) => {
        setResults(Array.isArray(data) ? data : []);
        setLastRefreshed(new Date());
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load RCA results");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchResults, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, machineFilter]);

  const machineIds = useMemo(() => {
    const ids = new Set(results.map((r) => r.machine_id));
    return Array.from(ids).sort();
  }, [results]);

  const filtered = useMemo(() => {
    let list = results.filter((r) => {
      if (severityFilter && r.severity !== severityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          r.problem.toLowerCase().includes(q) ||
          r.cause.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.machine_id.toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sortBy === "severity") {
      list = [...list].sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
      );
    }
    return list;
  }, [results, severityFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    return results.reduce(
      (acc, r) => {
        acc[r.severity] = (acc[r.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [results]);

  return (
    <div className="rca-log-page">
      {/* Header */}
      <div className="rca-log-header">
        <div className="rca-log-title-block">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/dashboard")}
            style={{ marginBottom: 8, fontSize: 13 }}
          >
            ← Dashboard
          </button>
          <h1 className="rca-log-title">
            🔍 Root Cause Analysis Log
          </h1>
          <p className="rca-log-subtitle">
            Real-time output of the AI-driven RCA engine — all anomalies detected, causes identified, and corrective actions recommended.
          </p>
        </div>

        {/* Summary pills */}
        <div className="rca-summary-pills">
          <div className="rca-pill rca-pill-total">
            <span className="rca-pill-num">{results.length}</span>
            <span className="rca-pill-label">Total Events</span>
          </div>
          <div className="rca-pill" style={{ background: SEVERITY_BG.high, borderColor: SEVERITY_COLOR.high }}>
            <span className="rca-pill-num" style={{ color: SEVERITY_COLOR.high }}>{counts.high || 0}</span>
            <span className="rca-pill-label" style={{ color: SEVERITY_COLOR.high }}>Critical</span>
          </div>
          <div className="rca-pill" style={{ background: SEVERITY_BG.medium, borderColor: SEVERITY_COLOR.medium }}>
            <span className="rca-pill-num" style={{ color: SEVERITY_COLOR.medium }}>{counts.medium || 0}</span>
            <span className="rca-pill-label" style={{ color: SEVERITY_COLOR.medium }}>Warning</span>
          </div>
          <div className="rca-pill" style={{ background: SEVERITY_BG.low, borderColor: SEVERITY_COLOR.low }}>
            <span className="rca-pill-num" style={{ color: SEVERITY_COLOR.low }}>{counts.low || 0}</span>
            <span className="rca-pill-label" style={{ color: SEVERITY_COLOR.low }}>Low</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rca-toolbar">
        <div className="rca-toolbar-left">
          <input
            id="rca-search"
            type="text"
            className="rca-search"
            placeholder="Search problems, causes, actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            id="rca-machine-filter"
            className="rca-select"
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
          >
            <option value="">All Machines</option>
            {machineIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <select
            id="rca-severity-filter"
            className="rca-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as "" | "high" | "medium" | "low")}
          >
            <option value="">All Severities</option>
            <option value="high">High / Critical</option>
            <option value="medium">Medium / Warning</option>
            <option value="low">Low</option>
          </select>
          <select
            id="rca-sort"
            className="rca-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "time" | "severity")}
          >
            <option value="time">Sort: Newest First</option>
            <option value="severity">Sort: Severity</option>
          </select>
        </div>
        <div className="rca-toolbar-right">
          <label className="rca-auto-refresh">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button type="button" className="btn btn-outline" onClick={fetchResults} style={{ fontSize: 13 }}>
            ↻ Refresh
          </button>
          <span className="rca-last-refreshed">
            Updated {timeAgo(lastRefreshed.toISOString())}
          </span>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="rca-loading">
          <div className="prov-spinner" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
          <p>Loading RCA results from database...</p>
        </div>
      )}

      {error && (
        <div className="rca-error">
          <strong>⚠ Could not load RCA results:</strong> {error}
          <br />
          <span style={{ fontSize: 13, opacity: 0.7 }}>
            Make sure the backend is running and reachable. If no anomalies have been detected yet, start the IoT Simulator and trigger a fault.
          </span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rca-empty">
          <div className="rca-empty-icon">🟢</div>
          <h3>No RCA Events Found</h3>
          <p>
            {results.length === 0
              ? "The RCA engine has not detected any anomalies yet. Use the IoT Simulator on the Dashboard to publish a sensor payload that exceeds the fault thresholds (e.g. vibration > 5.0 mm/s or temperature > 55°C)."
              : "No results match the current filters. Try clearing the search or changing severity filter."}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => navigate("/dashboard")}
            style={{ marginTop: 16 }}
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rca-results-list">
          <div className="rca-results-count">
            Showing {filtered.length} of {results.length} events
          </div>
          {filtered.map((result) => (
            <div
              key={result.id}
              className={`rca-result-card sev-${result.severity} ${expandedId === result.id ? "expanded" : ""}`}
              style={{ borderLeftColor: SEVERITY_COLOR[result.severity] }}
            >
              <button
                type="button"
                className="rca-result-summary"
                onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
              >
                <div className="rca-result-left">
                  <span
                    className="rca-severity-badge"
                    style={{
                      background: SEVERITY_BG[result.severity],
                      color: SEVERITY_COLOR[result.severity],
                      border: `1px solid ${SEVERITY_COLOR[result.severity]}`,
                    }}
                  >
                    {result.severity.toUpperCase()}
                  </span>
                  <div className="rca-result-info">
                    <div className="rca-result-problem">{result.problem}</div>
                    <div className="rca-result-meta">
                      <span className="rca-machine-chip">{result.machine_id}</span>
                      <span className="rca-time">{timeAgo(result.created_at)}</span>
                      <span className="rca-time-abs">
                        {new Date(result.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rca-expand-icon">{expandedId === result.id ? "▲" : "▼"}</div>
              </button>

              {expandedId === result.id && (
                <div className="rca-result-detail">
                  <div className="rca-detail-grid">
                    <div className="rca-detail-block">
                      <div className="rca-detail-label">🔎 Identified Cause</div>
                      <div className="rca-detail-value">{result.cause}</div>
                    </div>
                    {result.evidence && (
                      <div className="rca-detail-block">
                        <div className="rca-detail-label">📊 Evidence</div>
                        <div className="rca-detail-value rca-evidence">{result.evidence}</div>
                      </div>
                    )}
                    <div className="rca-detail-block rca-action-block">
                      <div className="rca-detail-label">✅ Recommended Action</div>
                      <div className="rca-detail-value rca-action">{result.action}</div>
                    </div>
                    <div className="rca-detail-block">
                      <div className="rca-detail-label">📋 Event ID</div>
                      <div className="rca-detail-value"><code>RCA-{result.id.toString().padStart(5, "0")}</code></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
