# HANDOVER.md — Bebas QC Continuation Prompt

We're continuing an ongoing task. Use this handoff as the
current source of truth unless I correct it.

---

## Goal

Build and polish **Bebas QC** — a dark-blue, industrial-themed AI quality control platform for manufacturing — into a fully production-ready, visually premium web app. The core backend and CI/CD pipeline are complete. What remains is focused on **frontend UI consistency, polish, and UX completeness**.

---

## Current Status

### ✅ Already Done

- **Backend (Go / Gin)**
  - `GET /api/rca` — RCA results with machine_id filter + limit cap
  - `GET /api/config` — Dynamic Telegram bot username
  - `GET /readings/:machine_id` — Redis-cached sensor readings (10s TTL)
  - `GET /api/vision/frame` + `POST /api/vision/roboflow` — Roboflow inference proxy
  - `GET /health` + `GET /api/health` — health checks
  - DB retry loop on `Connect()` (15 attempts × 2s)

- **Frontend (React + TypeScript + Vite)**
  - `/` → `ControlHub.tsx` — dark-blue industrial landing page with challenge/solution cards, animated SVG topology, and 4 glassmorphic navigation cards
  - `/dashboard` → `Dashboard.tsx` — live MQTT telemetry, Latest RCA card, collapsible MQTT config, recharts line charts
  - `/inspect` → `InspectMachine.tsx` — animated SCADA SVG synoptics (gears, pistons, drips, bottles), telemetry dials, RCA findings sidebar, machine alarm log
  - `/rca` → `RCALog.tsx` — live RCA audit log with search, machine/severity filters, sort, auto-refresh every 15s, expandable cards
  - `/simulator` → `Simulator.tsx` (opens as separate tab) — MQTT publisher with visibility-aware sleep, 5-min idle pause, 30-min session cap
  - `SimulatorContext.tsx` — global drawer persists across route changes

- **Infrastructure / DevOps**
  - Nginx `/mqtt` WebSocket reverse proxy (wss:// in production)
  - `deploy.yml` CI/CD: detect changed services, build+push to GHCR, SSH deploy to GCP VM
  - PostgreSQL volume cleared on every deploy → fresh schema from `init.sql`
  - HiveMQ: named Docker volumes (fixes UID 10000 permission crash), no broken healthcheck
  - `restart: unless-stopped` on Redis, HiveMQ, backend, frontend, nginx
  - SSL via Certbot / Let's Encrypt (auto-renew every 12h)

- **Design System**
  - Global tokens in `index.css`: dark navy `#060a13`, cyan `#38bdf8`, Space Grotesk + JetBrains Mono fonts, blueprint grid background
  - `App.css`: 2377 lines of component-level styles (hub, dashboard, simulator, RCA log, SCADA inspector, drawer overlay)

---

### 🔄 In Progress

- **UI Theme Consistency** — the industrial blue theme has been applied globally through CSS variables and `App.css`, but **several components still use hardcoded light-theme inline styles** that contradict the dark theme:
  - `ErrorBoundary.tsx` — uses hardcoded white background (`#f8fafc`, `#ffffff`), light text (`#0f172a`, `#475569`), and a light box-shadow. Should match the dark cockpit theme.
  - `App.tsx` (loading state) — the "Initializing / Loading Bebas QC…" spinner card uses hardcoded light inline styles (`color: "#0f172a"`, `color: "#64748b"`) instead of the dark theme variables.

---

### 🔲 Still Needs to Happen

#### P1 — UI/UX Fixes (Critical Visual Inconsistencies)

1. **`ErrorBoundary.tsx` — Dark Theme Restyle**
   - Currently renders a bright white card on a light gradient background — breaks the immersive cockpit experience immediately on any crash.
   - Needs: navy/glassmorphism background, cyan accent button, dark error card matching `hub-container` aesthetic.

2. **`App.tsx` Loading State — Dark Theme Restyle**
   - The `!ready` spinner renders a hardcoded light card (`#0f172a` text on white). Should use the same dark background with the existing `.prov-spinner` class styled correctly.
   - Fix: Replace inline style overrides with CSS class-based dark variants.

3. **`ControlHub.tsx` — Mobile Responsiveness**
   - `.story-section` uses `grid-template-columns: repeat(2, 1fr)` with no responsive breakpoint — on phones, the two story cards (Challenge / Solution) are squeezed into 50% width columns.
   - `.hub-grid` (the 4 navigation cards) may also need `grid-template-columns: 1fr` stacking on narrow screens.
   - `.topology-svg` viewBox is 800×240 and will overflow on small screens — needs `width: 100%; overflow-x: auto` wrapper or responsive scaling.
   - `.hub-title` is `font-size: 52px` — no mobile breakpoint defined for this class. Should scale down to ~32–36px on mobile.

4. **`Dashboard.tsx` — Overflow & Layout on Mobile**
   - The charts and telemetry panels may overflow horizontally on small screens. No explicit mobile layout guards have been verified for this page beyond what Recharts provides out of the box.
   - The live video Roboflow frame section (if rendered) needs a max-height cap on mobile.

5. **`RCALog.tsx` — Sticky Toolbar Z-index & Scroll**
   - The filter toolbar may not be correctly sticky on iOS Safari due to `position: sticky` and `overflow` interaction on the parent. Needs cross-browser verification.

#### P2 — UX Completeness

6. **Global Navbar / Back Navigation**
   - Every page (Dashboard, InspectMachine, RCALog) implements its own ad-hoc back button using `navigate("/")`. There's no shared `<NavBar />` component.
   - Benefit: Consistent navigation UX, single source of truth for breadcrumbs, and easier to add new pages.
   - Recommended: Create `components/NavBar.tsx` — a fixed top or side rail nav bar with the BEBAS QC logo, current page indicator, and quick-access links (Dashboard / Inspect / RCA Log / Home).

7. **`/simulator` Route — In-App vs. New Tab**
   - The Simulator card in `ControlHub.tsx` uses an `<a href="/simulator" target="bebasqc_simulator">` link that opens a completely separate browser tab — this means the Simulator is not accessible via the `GlobalSimulatorDrawer` from that entry point.
   - There is a mismatch: `App.tsx` has a global drawer for the Simulator, but the ControlHub card bypasses it by opening a new tab.
   - Decision needed: Either remove the standalone `/simulator` route and always use the drawer, or make the ControlHub card use `navigate("/simulator")` and register that route inside `App.tsx`.

8. **`InspectMachine.tsx` — Machine Selector UX**
   - The machine selector currently only supports `LINE1_STN1`, `LINE1_STN2`, `LINE2_STN1`, `LINE2_STN2`. If machines are added in the backend, the dropdown won't update unless a developer hardcodes the new ID.
   - Improvement: Fetch available machine IDs dynamically from the backend (e.g., a new `GET /api/machines` endpoint or by reading distinct `machine_id` values from `/readings`).

9. **Empty State Handling — RCALog + Dashboard**
   - When the backend database is freshly wiped (on every deploy), both RCALog and the Dashboard Latest RCA card show an empty/null state. The empty-state UX is functional but could be improved with clearer instructions for operators.
   - Specifically: The "No anomalies detected yet" empty state in RCALog doesn't guide the user to the Simulator drawer to trigger a fault.

#### P3 — Nice to Have

10. **Shared `useRCAPolling()` Hook**
    - Both `Dashboard.tsx` and `RCALog.tsx` independently implement `setInterval`-based polling against `/api/rca`. This is duplicated logic.
    - Refactor: Create a shared `hooks/useRCAPolling.ts` hook to centralize polling interval, auto-refresh, and error state.

11. **`Simulator.tsx` — Accessible on Mobile**
    - The Simulator sliders and controls were designed for desktop. On mobile, the drawer may be too tall and the controls too tight. Touch targets on sliders may be too small.

12. **SEO — Open Graph / Twitter Card Meta Tags**
    - `index.html` has a descriptive title and meta description, but no Open Graph (`og:`) or Twitter Card tags. Adding these would improve link previews when the URL is shared in messaging apps or on social media.

---

## Important Context

- **Audience:** Industrial operators and QA engineers — they are not developers. The UI should feel like a **professional SCADA HMI / industrial cockpit**, not a startup demo.
- **Tone:** Confident, premium, zero-clutter. Every screen should feel intentional.
- **Tech constraints:**
  - Frontend: React + TypeScript + Vite + Vanilla CSS (no Tailwind, no CSS-in-JS framework)
  - Styling: All styles live in `App.css` and `index.css`. No component-level `.module.css` files exist yet — new styles should follow the same pattern unless a refactor is agreed upon.
  - The router is a custom hand-rolled SPA router in `App.tsx` using `window.history.pushState` — **not React Router**. Adding new routes means adding new `if (path === ...)` cases in `renderPage()`.

- **Key Files:**
  - [`index.css`](services/frontend/src/index.css) — global design tokens, font import, body blueprint grid
  - [`App.css`](services/frontend/src/App.css) — all component styles (2377 lines)
  - [`App.tsx`](services/frontend/src/App.tsx) — router, global simulator drawer, session initialization
  - [`ErrorBoundary.tsx`](services/frontend/src/ErrorBoundary.tsx) — crash handler (currently light-themed — broken)
  - [`ControlHub.tsx`](services/frontend/src/pages/ControlHub.tsx) — landing page
  - [`Dashboard.tsx`](services/frontend/src/pages/Dashboard.tsx) — live telemetry (749 lines)
  - [`InspectMachine.tsx`](services/frontend/src/pages/InspectMachine.tsx) — SCADA (46KB — largest file)
  - [`RCALog.tsx`](services/frontend/src/pages/RCALog.tsx) — RCA audit log
  - [`Simulator.tsx`](services/frontend/src/pages/Simulator.tsx) — MQTT simulator
  - [`docker-compose.yml`](docker-compose.yml) — all Docker services
  - [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — CI/CD pipeline

- **Production URL:** https://bebasqc.geraldmanurung.site
- **Registry:** `ghcr.io/geraldman/bebas-qc`
- **GCP VM SSH user:** `g3rald_dj`
- **n8n webhook:** `https://bebasqc.geraldmanurung.site/n8n/`

---

## Decisions Already Made

- **No React Router** — custom `pushState` router in `App.tsx`. Reason: already in place, works, avoids an extra dependency.
- **No Tailwind** — vanilla CSS only. Reason: explicit user constraint.
- **Simulator opens in new tab from ControlHub** — `<a target="bebasqc_simulator">`. Reason: originally to allow simultaneous Simulator + Dashboard use. However this creates a UX inconsistency with the GlobalSimulatorDrawer. This decision is still open for reversal.
- **PostgreSQL wiped on every deploy** — simplifies schema migration for a project still in active development. Rationale documented in `agents.md`.
- **HiveMQ named volumes** — resolves UID 10000 permission denied on GCP VM host bind-mounts.
- **No mock data toggle** — dashboard is live-only. Mock data checkbox was removed to reflect production intent.
- **Simulator billing guards** — visibility sleep + 5-min idle + 30-min cap. Prevents runaway MQTT publishing cost on HiveMQ Cloud.

---

## What to Avoid

- **Don't add React Router or any new routing library** — the hand-rolled router is intentional.
- **Don't add Tailwind or component-scoped CSS modules** — all styles belong in `App.css` / `index.css`.
- **Don't restore the sandbox/demo artifacts** — the 15-minute session timer, fake Docker provisioning animation, and session expiry overlay were deliberately removed (TASK-03). They were for a demo model that no longer exists.
- **Don't hardcode the Telegram bot username** — it is now fetched dynamically from `GET /api/config`.
- **Don't re-add the mock data checkbox** — dashboard is intentionally live-only.
- **Don't break the GlobalSimulatorDrawer** — the Simulator component must stay mounted at the App level so MQTT state persists across route changes.
- **Don't remove the `restart: unless-stopped`** policies from `docker-compose.yml` — these are required for production daemon resilience.
- **Avoid `{{ }}` double-brace template syntax inside `deploy.yml`** — this breaks the GitHub Actions YAML parser (documented in TASK-11).

---

## Open Questions / Blockers

1. **Simulator route conflict** — Should `/simulator` be a proper in-app route (registered in `App.tsx`) that renders inline, or should it remain a standalone tab via `<a target="_blank">`? The current hybrid causes confusion: the GlobalSimulatorDrawer exists but the landing page bypasses it.

2. **Shared NavBar** — Should a persistent navigation component be added? If yes, should it be a top bar or a left sidebar rail? The current pages each implement their own isolated back button.

3. **`GET /api/machines` endpoint** — Should the backend expose a list of available machine IDs so the frontend doesn't need to hardcode them? This is a minor backend change but unblocks the InspectMachine dynamic selector (P2 item #8).

4. **Mobile testing** — The InspectMachine viewport fix (TASK-16) was implemented and verified in code, but actual mobile device testing on the production URL has not been confirmed. The `story-section` 2-column grid on `ControlHub.tsx` likely breaks on narrow screens.

---

## Next Best Step

**Fix the two most visually jarring inconsistencies first** — they are the first things any new visitor will encounter if they hit an error or are on a slow connection:

1. **Restyle `ErrorBoundary.tsx`** to match the dark industrial cockpit theme (navy background, glassmorphism card, cyan accent button, monospace error code block in dark style).

2. **Fix `App.tsx` loading state** — the `!ready` card renders hardcoded light inline styles. Replace with the dark design system variables.

3. **Then** fix `ControlHub.tsx` mobile breakpoints (the 2-column `story-section` grid → single column at `<= 768px`, hub-title font-size scaling, topology SVG overflow).

These three items require only CSS and JSX changes — no backend work, no new dependencies, no CI/CD changes.

---

## How to Respond

- Start with a short summary of your understanding.
- Continue from here instead of restarting from scratch.
- If anything critical is missing, ask only the minimum questions needed.
