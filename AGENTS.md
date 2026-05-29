# Bebas QC — Agent Session Log (`agents.md`)

This document captures every task, decision, implementation, and configuration change made by the AI coding agent during this full development session. Format is JSON-style for structured readability.

---

```json
{
  "session": {
    "project": "bebas-qc",
    "repository": "https://github.com/geraldman/bebas-qc",
    "production_url": "https://bebasqc.geraldmanurung.site",
    "conversation_id": "3236fe8c-9610-4964-abc4-16abff99a21c",
    "agent": "Antigravity (Google DeepMind)",
    "stack": {
      "frontend": "React + TypeScript (Vite), Vanilla CSS",
      "backend": "Go 1.22 (Gin HTTP framework)",
      "database": "PostgreSQL 16 (Alpine)",
      "cache": "Redis 7 (Alpine)",
      "messaging": "MQTT via HiveMQ Community Edition",
      "automation": "n8n workflow engine",
      "reverse_proxy": "Nginx (Alpine)",
      "ssl": "Certbot / Let's Encrypt",
      "ci_cd": "GitHub Actions → GHCR → GCP VM via SSH",
      "registry": "ghcr.io/geraldman/bebas-qc"
    }
  },

  "tasks": [

    {
      "id": "TASK-01",
      "title": "Business Logic Realignment — Backend API: GET /api/rca",
      "priority": 1,
      "status": "completed",
      "description": "The RCA engine was running correctly and saving records to the `rca_results` table, but there was no API endpoint exposing the data. Operators had zero visibility into anomaly findings.",
      "changes": [
        {
          "file": "services/backend/db/queries.go",
          "action": "NEW",
          "details": "Added `GetRCAResults(db *sqlx.DB, machineID string, limit int) ([]models.RCAResult, error)` function. Queries `rca_results` table. Supports optional `machine_id` filtering. Results ordered newest-first."
        },
        {
          "file": "services/backend/cmd/main.go",
          "action": "MODIFIED",
          "details": "Added `GET /api/rca` route. Accepts query params: `machine_id` (optional filter) and `limit` (default 100, max 500). Returns JSON array of RCA result objects."
        },
        {
          "file": "services/backend/cmd/main.go",
          "action": "MODIFIED",
          "details": "Removed background sandbox-cleanup goroutine that deleted `telegram_subscriptions` rows every 15 minutes (leftover from discarded demo sandbox model)."
        }
      ],
      "api_endpoint": {
        "method": "GET",
        "path": "/api/rca",
        "query_params": {
          "machine_id": "Optional. Filter by machine identifier (e.g., LINE1_STN1).",
          "limit": "Optional. Number of records to return. Default: 100. Max: 500."
        },
        "response_example": "[{ \"id\": 1, \"machine_id\": \"LINE1_STN1\", \"problem\": \"High vibration\", \"cause\": \"Bearing wear\", \"action\": \"Schedule maintenance\", \"severity\": \"high\", \"created_at\": \"2026-05-28T17:00:00Z\" }]"
      }
    },

    {
      "id": "TASK-02",
      "title": "Frontend: New RCALog Page",
      "priority": 2,
      "status": "completed",
      "description": "Built a full, live-updating RCA audit log page that displays all anomaly findings surfaced by the AI engine.",
      "changes": [
        {
          "file": "services/frontend/src/pages/RCALog.tsx",
          "action": "NEW",
          "features": [
            "Fulltext search: filter by problem, cause, action, machine name",
            "Dropdown filter by machine_id",
            "Dropdown filter by severity (high / medium / low)",
            "Sort by newest-first or by severity",
            "Auto-refresh every 15 seconds",
            "Summary pills in header: Total / Critical / Warning / Low counts",
            "Expandable result cards with severity-colored left borders",
            "Each card shows: problem, cause, evidence (monospace DB-style), recommended action",
            "Clear empty-state guide for new operators"
          ]
        },
        {
          "file": "services/frontend/src/App.css",
          "action": "MODIFIED",
          "details": "Added full premium CSS for RCA log page: dark gradient header, sticky filter toolbar, expandable result cards, severity borders, animated expansion, responsive grid for detail view."
        }
      ]
    },

    {
      "id": "TASK-03",
      "title": "Frontend: App.tsx — Session Cleanup & Routing",
      "priority": 3,
      "status": "completed",
      "description": "Removed all sandbox/demo artifacts from App.tsx and added proper persistent session management and new routing.",
      "changes": [
        {
          "file": "services/frontend/src/App.tsx",
          "action": "REWRITTEN",
          "removed": [
            "15-minute countdown session timer",
            "Fake Docker provisioning animation (6-step fake progress overlay)",
            "Session expiry overlay and redirect logic"
          ],
          "added": [
            "Persistent session: `containerId` generated once, stored in `localStorage` permanently",
            "/rca route → RCALog page",
            "Simpler initialization (read/create ID from storage)"
          ]
        }
      ]
    },

    {
      "id": "TASK-04",
      "title": "Frontend: Dashboard.tsx Enhancements",
      "priority": 4,
      "status": "completed",
      "description": "Enhanced the live telemetry dashboard with RCA awareness and cleaner UI.",
      "changes": [
        {
          "file": "services/frontend/src/pages/Dashboard.tsx",
          "action": "MODIFIED",
          "added": [
            "\"Latest RCA Finding\" card — polls /api/rca?limit=1 every 20 seconds, shows most recent anomaly with severity color, machine ID, cause, and recommended action",
            "\"🔍 RCA Log\" button in header actions (indigo color for visibility)",
            "navigate('/rca') call on 'Run RCA' anchor click"
          ],
          "changed": [
            "MQTT Config card is now collapsible (click to expand/collapse) — reduces visual clutter for non-technical operators",
            "Telegram Bot username is now fetched dynamically from /api/config instead of being hardcoded to 'BebasQcBot'"
          ],
          "removed": [
            "Mock data checkbox toggle — dashboard now uses exclusively live MQTT telemetry",
            "Hardcoded 'BebasQcBot' Telegram username"
          ]
        }
      ]
    },

    {
      "id": "TASK-05",
      "title": "Frontend: ControlHub.tsx — Navigation Overhaul",
      "priority": 5,
      "status": "completed",
      "description": "Updated the gateway page (ControlHub) to reflect the actual product scope.",
      "changes": [
        {
          "file": "services/frontend/src/pages/ControlHub.tsx",
          "action": "MODIFIED",
          "changed": [
            "Removed 'PROTOTYPE HUB' badge",
            "Added RCA Log as second navigation card (between Dashboard and Simulator)",
            "Simulator card now labeled with [DEV] badge",
            "Updated tagline to: 'AI-powered root cause analysis for manufacturing'"
          ]
        }
      ]
    },

    {
      "id": "TASK-06",
      "title": "Frontend: InspectMachine.tsx — Simulator Context & RCA Panel",
      "priority": 6,
      "status": "completed",
      "description": "Refocused the machine inspection page to the real-time business logic.",
      "changes": [
        {
          "file": "services/frontend/src/pages/InspectMachine.tsx",
          "action": "MODIFIED",
          "removed": [
            "E-Stop, Reset, Overheat, Vibration surge buttons (bypassed Simulator — not single source of truth)",
            "Duplicate local simulator drawer"
          ],
          "added": [
            "Machine RCA Findings panel: sidebar section polling /api/rca?machine_id=<active_machine> for recent events",
            "Integrated global useSimulator context (unified with Dashboard and RCALog)"
          ]
        }
      ]
    },

    {
      "id": "TASK-07",
      "title": "Backend: Casing Compatibility Fix (JSON Tags)",
      "priority": 7,
      "status": "completed",
      "description": "Fixed runtime crashes caused by mixed-case database response fields.",
      "changes": [
        {
          "file": "services/backend/models/ (RCAResult, SensorReading structs)",
          "action": "MODIFIED",
          "details": "Added explicit `json:\"...\"` tags to normalize DB rows to standard camelCase in API payloads."
        },
        {
          "file": "services/frontend/src/pages/InspectMachine.tsx",
          "action": "MODIFIED",
          "details": "Added defensive case-insensitive property fallbacks (e.g., finding.severity ?? finding.Severity) to prevent runtime crashes on mixed/corrupt DB responses."
        },
        {
          "file": "services/frontend/src/pages/Dashboard.tsx",
          "action": "MODIFIED",
          "details": "Same case-insensitive fallbacks + safe timestamp formatting."
        }
      ]
    },

    {
      "id": "TASK-08",
      "title": "Backend: Dynamic Config Endpoint",
      "priority": 8,
      "status": "completed",
      "description": "Expose runtime configuration to the frontend so deployers can customize without rebuilding.",
      "changes": [
        {
          "file": "services/backend/cmd/main.go",
          "action": "MODIFIED",
          "details": "Added `GET /api/config` endpoint. Reads `TELEGRAM_BOT_USERNAME` from environment/.env and returns it as JSON."
        },
        {
          "file": ".env / .env.example",
          "action": "MODIFIED",
          "details": "Added `TELEGRAM_BOT_USERNAME` env variable documentation."
        }
      ],
      "api_endpoint": {
        "method": "GET",
        "path": "/api/config",
        "response_example": "{ \"telegram_bot_username\": \"BebasQcBot\" }"
      }
    },

    {
      "id": "TASK-09",
      "title": "IoT Simulator: Billing Optimization (Visibility & Idle Guards)",
      "priority": 9,
      "status": "completed",
      "description": "Prevented the simulator from publishing MQTT data indefinitely, which would cause unnecessary billing on HiveMQ and waste cloud resources.",
      "changes": [
        {
          "file": "services/frontend/src/pages/Simulator.tsx",
          "action": "MODIFIED",
          "features": [
            "Visibility-Aware Sleep: suspends simulation when browser tab is hidden (visibilitychange event) — resumes on focus",
            "Inactivity Sleep: auto-pauses after 5 minutes of no user interaction (mouse, keyboard, scroll, click). Shows blurry overlay with 'Resume Simulation' button",
            "Session Duration Cap: hard 30-minute safety limit on continuous publishing. Requires manual resume to continue"
          ]
        }
      ]
    },

    {
      "id": "TASK-10",
      "title": "SCADA Telemetry Synoptics Redesign (InspectMachine SVG)",
      "priority": 10,
      "status": "completed",
      "description": "The SCADA schematic SVG was too small and static. Redesigned to be larger, clearer, and highly animated to convey real-time production state.",
      "changes": [
        {
          "file": "services/frontend/src/pages/InspectMachine.tsx",
          "action": "MODIFIED",
          "svg_changes": [
            "Scaled station nodes: 100x60 → 120x70 px. Recentered coordinate system.",
            "Corrected flow path alignment to run through exact node centers (y=120, y=250). Fixed 20px layout offset.",
            "Conveyor node: Added dual spinning gears with CSS transform-origin and rotation keyframes",
            "Conveyor belt (L1): Animated moving boxes sliding between nodes in sync with conveyor speed",
            "Labeler node: Rebuilt stamping mechanism — moving piston shaft and contact pad that physically stamps down onto packages",
            "L2 Filler node: Liquid tank with oscillating liquid-level gradient, nozzle, fluid stream line, and dual dripping drops",
            "Moving Bottles (L2): Realistic glass bottles with amber liquid sliding along the pipeline, passing beneath nozzle and sealer",
            "Sealer node: Pneumatic sealer bar that stamps down, glows red, and rises back up"
          ]
        }
      ]
    },

    {
      "id": "TASK-11",
      "title": "CI/CD: GCP VM Deployment — Clear PostgreSQL Database on Deploy",
      "priority": 11,
      "status": "completed",
      "description": "Every deployment now wipes the postgres data volume so the VM starts fresh with a clean schema from init.sql.",
      "changes": [
        {
          "file": ".github/workflows/deploy.yml",
          "action": "MODIFIED",
          "deploy_script_steps": [
            "git pull origin main",
            "POSTGRES_VOL=$(docker volume ls -q | grep -E '(bebas-qc|bebasqc)_postgres_data' | head -n 1)  — dynamic volume name detection",
            "docker compose down  — cleanly stop all containers and release volume locks",
            "docker volume rm $POSTGRES_VOL 2>/dev/null || true  — remove discovered volume",
            "docker volume rm bebas-qc_postgres_data bebasqc_postgres_data 2>/dev/null || true  — static fallbacks",
            "docker compose pull  — pull latest images from GHCR",
            "docker compose up -d --no-build  — restart stack (postgres auto-re-runs init.sql)",
            "docker image prune -f  — cleanup obsolete image layers",
            "Health check loop: curl http://localhost/api/health, 15 retries × 4 seconds"
          ],
          "rationale": "Volume deletion approach chosen over template braces ({{ }}) due to YAML parsing conflicts in GitHub Actions CI runner."
        }
      ]
    },

    {
      "id": "TASK-12",
      "title": "Bug Fix: SecurityError — WebSocket Over HTTPS",
      "priority": 12,
      "status": "completed",
      "error": "SecurityError: Failed to construct 'WebSocket': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.",
      "root_cause": "The frontend was connecting to ws://... directly even when served over HTTPS. Browsers enforce mixed-content blocking for insecure WebSocket connections on secure pages.",
      "changes": [
        {
          "file": "docker/nginx/nginx.conf",
          "action": "MODIFIED",
          "details": "Added `/mqtt` location block to proxy WebSocket connections: captures ws/wss on port 80/443, terminates SSL, forwards to hivemq:8000 with correct Upgrade and Connection headers."
        },
        {
          "file": "services/frontend/src/pages/Dashboard.tsx",
          "action": "MODIFIED",
          "details": "Added environment-aware MQTT_URL determination. Local dev (localhost, 127.0.0.1, port 3000/5173) connects directly to ws://...:8000/mqtt. Production uses wss:// or ws:// through Nginx /mqtt path."
        },
        {
          "file": "services/frontend/src/pages/InspectMachine.tsx",
          "action": "MODIFIED",
          "details": "Same environment-aware MQTT_URL protocol detection as Dashboard."
        },
        {
          "file": "services/frontend/src/pages/Simulator.tsx",
          "action": "MODIFIED",
          "details": "Same environment-aware MQTT_URL protocol detection."
        },
        {
          "file": "docker-compose.yml",
          "action": "MODIFIED",
          "details": "Added hivemq to nginx depends_on block to prevent name-resolution crashes at startup."
        }
      ]
    },

    {
      "id": "TASK-13",
      "title": "Infrastructure: Backend DB Retry Loop",
      "priority": 13,
      "status": "completed",
      "description": "The Go backend crashed with a Fatal error if PostgreSQL was still running init.sql when the backend container started.",
      "changes": [
        {
          "file": "services/backend/db/db.go",
          "action": "MODIFIED",
          "details": "Added 15-attempt retry loop (2 second sleep between attempts) inside Connect(). Prevents crash loop when postgres volume is freshly created and init.sql is still executing."
        }
      ]
    },

    {
      "id": "TASK-14",
      "title": "Infrastructure: HiveMQ Volume Permission Fix",
      "priority": 14,
      "status": "completed",
      "description": "HiveMQ container was failing with 'Permission Denied' on the GCP VM because host directories were owned by the deployment user (root or g3rald_dj), not UID 10000 which HiveMQ runs as.",
      "changes": [
        {
          "file": "docker-compose.yml",
          "action": "MODIFIED",
          "details": "Migrated HiveMQ data and log mounts from host bind-mounts (`./docker/hivemq/data`) to named Docker volumes (`hivemq_data`, `hivemq_log`). Docker manages ownership automatically."
        }
      ]
    },

    {
      "id": "TASK-15",
      "title": "Infrastructure: HiveMQ Health Check & Restart Policy",
      "priority": 15,
      "status": "completed",
      "description": "HiveMQ was showing permanently 'unhealthy' due to a broken curl health check on a port it doesn't expose (8090).",
      "changes": [
        {
          "file": "docker-compose.yml",
          "action": "MODIFIED",
          "details": [
            "Removed invalid healthcheck: `curl -f http://localhost:8090` from HiveMQ service.",
            "Added `restart: unless-stopped` to hivemq and redis services for daemon resilience."
          ]
        }
      ]
    },

    {
      "id": "TASK-16",
      "title": "Mobile & Desktop Layout Fix — InspectMachine Viewport",
      "priority": 16,
      "status": "completed",
      "description": "The InspectMachine page was overflowing its parent container on both mobile and desktop.",
      "changes": [
        {
          "file": "services/frontend/src/pages/InspectMachine.tsx",
          "action": "MODIFIED",
          "desktop_layout": {
            "container": "height: 100vh; max-height: 100vh; overflow: hidden",
            "split": "Two-column CSS grid — left column holds SCADA SVG canvas that scales to max available size; right inspector panel has independent overflow-y: auto scroll"
          },
          "mobile_layout": {
            "container": "Vertical flex layout",
            "scada_height": "260px fixed portrait-friendly height",
            "inspector": "Takes remaining screen height with own scroll context",
            "alarms_panel": "Fixed 120px footer height"
          }
        }
      ]
    },

    {
      "id": "TASK-17",
      "title": "UI Redesign — Industrial Blue Theme",
      "priority": 17,
      "status": "completed",
      "description": "Full visual overhaul to transition the platform from a generic prototype look to a premium dark-blue industrial cockpit aesthetic.",
      "design_system": {
        "color_palette": {
          "background_primary": "#07111e (deep industrial navy)",
          "background_secondary": "#0d1e30",
          "accent_primary": "#00cfff (cyber cyan)",
          "accent_secondary": "#0059ff (electric blue)",
          "text_primary": "#e8f4f8 (high contrast near-white)",
          "text_muted": "#6b8fa8 (slate gray)",
          "success": "#00f5a0",
          "warning": "#ffb800",
          "danger": "#ff4444"
        },
        "background_effect": "Blueprint schematic grid overlay using CSS repeating-linear-gradient",
        "typography": "Inter (Google Fonts) — replaced browser defaults",
        "effects": [
          "Glassmorphism cards: backdrop-filter blur + semi-transparent backgrounds",
          "Glowing neon borders on active elements",
          "Hover micro-animations on all interactive cards",
          "Animated SVG data-flow topology diagram with glowing pulses"
        ]
      },
      "changes": [
        {
          "file": "services/frontend/src/index.css",
          "action": "MODIFIED",
          "details": "Redefined all CSS custom properties (variables). Set dark color-scheme, navy backgrounds, cyan accents, schematic grid pattern, and Inter font import."
        },
        {
          "file": "services/frontend/src/App.css",
          "action": "MODIFIED",
          "details": "Updated all component classes (cards, buttons, sensor tables, sliders, alert banners, drawer panels, nav bars) to align with dark-blue cockpit schema. Replaced all hardcoded light-theme colors."
        },
        {
          "file": "services/frontend/src/pages/ControlHub.tsx",
          "action": "REWRITTEN",
          "sections": [
            "Hero Header: Project name, tagline, 3 KPI stat pills (Production Lines Monitored, Avg Detection Time, Alert Accuracy)",
            "The Challenge: Explanation of high-speed manufacturing losses, manual diagnostic delays, compounding mechanical degradation with animated metric cards",
            "The AI+IoT Solution: How edge telemetry, Roboflow CV camera frames, MQTT packets, and DB-driven correlation push actionable alerts. Shows architecture diagram",
            "Interactive Topology: Inline animated SVG data-flow diagram — 5 nodes (Sensors, MQTT, Backend RCA, PostgreSQL, n8n+Telegram) connected by animated glowing pulse paths",
            "Control Center Navigation: 4 glassmorphic cockpit navigation cards (Dashboard, SCADA Inspect, RCA Log, Simulator) with hover micro-animations"
          ]
        },
        {
          "file": "services/frontend/index.html",
          "action": "MODIFIED",
          "details": "Updated <title> tag and meta description for SEO. Title: 'Bebas QC | Industrial AI Quality Control Platform'. Meta description: 'Real-time IoT sensor telemetry, MQTT data pipelines, and AI-powered root cause analysis for manufacturing quality control.'"
        }
      ]
    }

  ],

  "infrastructure": {
    "docker_services": [
      {
        "name": "bebasqc_postgres",
        "image": "postgres:16-alpine",
        "volume": "postgres_data (named volume, cleared on each deploy)",
        "init_sql": "docker/postgres/init.sql"
      },
      {
        "name": "bebasqc_backend",
        "image": "ghcr.io/geraldman/bebas-qc/backend:latest",
        "port": "8080:8080",
        "language": "Go",
        "framework": "Gin"
      },
      {
        "name": "bebasqc_frontend",
        "image": "ghcr.io/geraldman/bebas-qc/frontend:latest",
        "port": "3000:80",
        "framework": "React + Vite"
      },
      {
        "name": "bebasqc_nginx",
        "image": "nginx:alpine",
        "ports": ["80:80", "443:443"],
        "ssl": "Let's Encrypt via Certbot",
        "websocket_proxy": "/mqtt → hivemq:8000"
      },
      {
        "name": "bebasqc_redis",
        "image": "redis:7-alpine",
        "port": "6379:6379",
        "usage": "Cache for sensor readings (TTL: 10s)"
      },
      {
        "name": "bebasqc_hivemq",
        "image": "hivemq/hivemq-ce:latest",
        "ports": ["1883:1883 (MQTT)", "8000:8000 (WebSocket)"],
        "volumes": ["hivemq_data (named)", "hivemq_log (named)"],
        "note": "Named volumes prevent UID 10000 permission errors on GCP VM host dirs"
      },
      {
        "name": "bebasqc_n8n",
        "image": "n8nio/n8n:latest",
        "port": "5678:5678",
        "usage": "Workflow automation — sends Telegram alerts when RCA detects anomalies",
        "webhook_url": "https://bebasqc.geraldmanurung.site/n8n/"
      },
      {
        "name": "bebasqc_certbot",
        "image": "certbot/certbot:latest",
        "usage": "Auto-renews SSL certificates every 12 hours"
      }
    ],
    "network": "bebasqc_network (bridge driver)",
    "named_volumes": ["postgres_data", "redis_data", "n8n_data", "hivemq_data", "hivemq_log"]
  },

  "api_routes": [
    {
      "method": "GET",
      "path": "/health",
      "description": "Simple health check (returns {status: ok})"
    },
    {
      "method": "GET",
      "path": "/api/health",
      "description": "Health check (API-prefixed version)"
    },
    {
      "method": "GET",
      "path": "/readings/:machine_id",
      "description": "Recent 50 sensor readings for a machine. Redis-cached with 10s TTL."
    },
    {
      "method": "GET",
      "path": "/api/rca",
      "description": "RCA analysis results. Params: machine_id (optional), limit (default 100, max 500)."
    },
    {
      "method": "GET",
      "path": "/api/config",
      "description": "Runtime config for frontend. Returns telegram_bot_username."
    },
    {
      "method": "GET",
      "path": "/api/vision/frame",
      "description": "Returns a random Roboflow image path. Params: status=ok|defect."
    },
    {
      "method": "POST",
      "path": "/api/vision/roboflow",
      "description": "Proxy to Roboflow inference API. Body: {image_url}. Converts local paths to base64 before forwarding."
    },
    {
      "method": "STATIC",
      "path": "/assets/roboflow/*",
      "description": "Serves Roboflow sample images from disk."
    }
  ],

  "frontend_pages": [
    {
      "path": "/",
      "component": "ControlHub.tsx",
      "description": "Industrial gateway landing page. Explains the challenge, the AI+IoT solution, shows animated data-flow topology, and provides navigation cards to all sections."
    },
    {
      "path": "/dashboard",
      "component": "Dashboard.tsx",
      "description": "Live telemetry dashboard. Shows sensor readings per machine in real-time via MQTT WebSocket. Includes Latest RCA Finding card, collapsible MQTT config, and header RCA Log shortcut."
    },
    {
      "path": "/inspect",
      "component": "InspectMachine.tsx",
      "description": "SCADA inspection view. Animated SVG synoptic diagram, vibration graphs, telemetry dials, machine RCA findings panel, and live alarm log. Fit to 100vh on desktop and mobile."
    },
    {
      "path": "/rca",
      "component": "RCALog.tsx",
      "description": "Full RCA audit log. Live-updating table of all anomalies with search, filter by machine/severity, sort options, and expandable detail cards."
    },
    {
      "path": "/simulator",
      "component": "Simulator.tsx",
      "description": "[DEV] IoT sensor simulator. Publishes fake MQTT payloads to HiveMQ. Features: visibility-aware sleep, 5-min idle pause, 30-min session cap."
    }
  ],

  "backend_packages": [
    {
      "package": "cmd/main.go",
      "role": "HTTP server entrypoint. All Gin route definitions. Redis client init. MQTT processor startup."
    },
    {
      "package": "db/",
      "role": "PostgreSQL connection (with retry loop), query functions: GetRecentReadings, GetRCAResults."
    },
    {
      "package": "mqtt/processor.go",
      "role": "Subscribes to bebasqc/# MQTT topics. Parses sensor payloads. Passes readings to RCA engine. Persists results to PostgreSQL."
    },
    {
      "package": "mqtt/alert.go",
      "role": "Sends HTTP webhook to n8n when RCA detects an anomaly."
    },
    {
      "package": "rca/engine.go",
      "role": "Core anomaly detection logic. Compares sensor readings against threshold rules. Produces RCAResult objects (problem, cause, action, severity)."
    },
    {
      "package": "rca/thresholds.go",
      "role": "Threshold constants for sensor reading boundaries (temperature, vibration, pressure, etc.)."
    },
    {
      "package": "models/",
      "role": "Go structs for SensorReading and RCAResult. Includes json tags for normalized API serialization."
    },
    {
      "package": "internal/config/",
      "role": "Environment-based configuration loader."
    }
  ],

  "cicd_pipeline": {
    "trigger": "push to main branch OR manual workflow_dispatch",
    "registry": "ghcr.io/geraldman/bebas-qc",
    "jobs": [
      {
        "job": "build-and-push",
        "runs_on": "ubuntu-latest",
        "steps": [
          "Checkout code",
          "Detect changed paths (dorny/paths-filter) — only build changed services",
          "Login to GHCR",
          "Setup QEMU + Docker Buildx",
          "Build & push backend image (if services/backend/** changed)",
          "Build & push frontend image (if services/frontend/** changed)"
        ]
      },
      {
        "job": "deploy",
        "runs_on": "ubuntu-latest",
        "needs": "build-and-push",
        "condition": "any service or infra changed, OR workflow_dispatch",
        "ssh_target": "GCP VM at secrets.GCP_VM_IP, user: g3rald_dj",
        "deploy_steps": [
          "cd ~/bebas-qc",
          "git pull origin main",
          "Detect postgres volume name dynamically with docker volume ls | grep",
          "docker compose down",
          "docker volume rm <detected-vol> (+ static fallbacks)",
          "docker compose pull",
          "docker compose up -d --no-build",
          "docker image prune -f",
          "Health check loop: curl localhost/api/health × 15 retries"
        ]
      }
    ]
  },

  "data_flow": {
    "description": "End-to-end pipeline from sensor hardware to operator alert",
    "steps": [
      {
        "step": 1,
        "actor": "Simulator.tsx (or real IoT hardware)",
        "action": "Publishes JSON sensor readings to MQTT topic bebasqc/<machine_id>"
      },
      {
        "step": 2,
        "actor": "HiveMQ CE",
        "action": "Brokers MQTT messages between publishers (sensors) and subscribers (Go backend)"
      },
      {
        "step": 3,
        "actor": "mqtt/processor.go",
        "action": "Subscribes to bebasqc/#. Parses payload. Saves sensor_readings row to PostgreSQL."
      },
      {
        "step": 4,
        "actor": "rca/engine.go",
        "action": "Evaluates reading against threshold rules. If anomaly detected, creates RCAResult."
      },
      {
        "step": 5,
        "actor": "mqtt/alert.go",
        "action": "POSTs anomaly summary as webhook to n8n."
      },
      {
        "step": 6,
        "actor": "n8n workflow",
        "action": "Routes webhook to Telegram Bot → sends notification to subscribed operators."
      },
      {
        "step": 7,
        "actor": "GET /api/rca",
        "action": "Frontend polls this endpoint every 15–20 seconds to display the latest anomaly findings in RCALog and Dashboard."
      },
      {
        "step": 8,
        "actor": "GET /readings/:machine_id",
        "action": "Frontend polls this for live telemetry charts and dials. Redis caches responses for 10 seconds."
      }
    ]
  },

  "known_issues_resolved": [
    {
      "issue": "SecurityError: WebSocket over HTTPS",
      "resolution": "Nginx /mqtt reverse proxy + environment-aware protocol detection in frontend"
    },
    {
      "issue": "HiveMQ container permanently showing 'unhealthy'",
      "resolution": "Removed invalid curl healthcheck on port 8090"
    },
    {
      "issue": "HiveMQ Permission Denied on GCP VM",
      "resolution": "Migrated from host bind-mounts to named Docker volumes"
    },
    {
      "issue": "Backend crashes with Fatal if postgres is still initializing",
      "resolution": "15-attempt retry loop with 2s sleep in db.Connect()"
    },
    {
      "issue": "Nginx startup crashes if hivemq not yet registered in DNS",
      "resolution": "Added hivemq to nginx depends_on in docker-compose.yml"
    },
    {
      "issue": "InspectMachine overflows screen on mobile and desktop",
      "resolution": "height: 100vh + overflow: hidden on container, independent scroll per panel"
    },
    {
      "issue": "YAML parsing conflict in deploy.yml ({{ }} template syntax)",
      "resolution": "Replaced Go template braces with shell-level volume discovery via grep"
    },
    {
      "issue": "Mixed-case DB field names crashing frontend renders",
      "resolution": "json tags on Go structs + defensive fallbacks in React components"
    }
  ],

  "environment_variables": {
    "backend": [
      "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB",
      "POSTGRES_HOST", "POSTGRES_PORT",
      "REDIS_HOST", "REDIS_PORT",
      "BACKEND_PORT",
      "ROBOFLOW_API_KEY", "ROBOFLOW_WORKFLOW_URL", "ROBOFLOW_IMAGE_DIR",
      "TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME"
    ],
    "github_secrets": [
      "GCP_VM_IP", "GCP_SSH_PRIVATE_KEY", "GITHUB_TOKEN"
    ]
  },

  "build_verification": {
    "frontend": "npm run build — 0 warnings, 0 errors",
    "backend": "go build ./... — 0 errors",
    "verified_after_tasks": ["TASK-09", "TASK-10", "TASK-16", "TASK-17"]
  }
}
```
