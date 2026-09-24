# Bebas QC — Industrial AI Quality Control Platform

[![Live Production](https://img.shields.io/badge/Live_Demo-bebasqc.geraldmanurung.site-00cfff?style=for-the-badge&logo=googlecloud&logoColor=white)](https://bebasqc.geraldmanurung.site)
[![Go](https://img.shields.io/badge/Backend-Go_1.22_(Gin)-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/Frontend-React_+_TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MQTT](https://img.shields.io/badge/Broker-HiveMQ_CE-ffb800?style=for-the-badge&logo=mqtt&logoColor=black)](https://www.hivemq.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

🌐 **Live Production URL:** [https://bebasqc.geraldmanurung.site](https://bebasqc.geraldmanurung.site)

> **Language / Bahasa:** [🇬🇧 **English Documentation**](#-english-documentation) | [🇮🇩 **Dokumentasi Bahasa Indonesia**](#-dokumentasi-bahasa-indonesia)

---

## 🏗️ System Architecture / Arsitektur Sistem

```mermaid
flowchart LR
    subgraph Edge["Edge Layer & Simulator"]
        SIM["IoT Simulator / Sensors"]
        CAM["Line Inspection Camera"]
    end

    subgraph Broker["Messaging & Proxy"]
        NGINX["Nginx Reverse Proxy (SSL / WSS)"]
        HIVEMQ["HiveMQ CE Broker (1883 / 8000)"]
    end

    subgraph Core["Backend & Storage"]
        GO["Go Gin Backend + RCA Engine"]
        REDIS["Redis 7 Cache (10s TTL)"]
        PG[("PostgreSQL 16 / Supabase DB")]
        RF["Roboflow CV API"]
    end

    subgraph Automation["Alerting & HMI"]
        N8N["n8n Workflow Engine"]
        TG["Telegram Bot Alerts"]
        UI["React SCADA Cockpit UI"]
    end

    SIM -- "WSS /mqtt" --> NGINX --> HIVEMQ
    HIVEMQ -- "TCP :1883" --> GO
    HIVEMQ -- "WSS /mqtt" --> UI
    GO --> REDIS
    GO --> PG
    CAM --> GO -- "Inference Proxy" --> RF
    GO -- "Webhook Trigger" --> N8N --> TG
    UI -- "REST /api/*" --> NGINX --> GO
```

---

# 🇬🇧 English Documentation

**Bebas QC** is an industrial-grade AI Quality Control, real-time SCADA telemetry, and automated Root Cause Analysis (RCA) platform built for high-speed manufacturing lines. Featuring a dark-blue industrial cockpit HMI aesthetic, it unifies edge IoT sensor streams (MQTT), computer vision defect detection (Roboflow), real-time anomaly correlation (Go + PostgreSQL + Redis), and instant operator alerting (n8n + Telegram Bot).

---

## 📖 How to Use the Application (User Guide)

### 1. Start at the Control Hub (`/`)
When you open [https://bebasqc.geraldmanurung.site](https://bebasqc.geraldmanurung.site), you land on the **Control Hub**:
- Review the real-time system architecture in the **Interactive Data-Flow Topology** diagram (Sensors → HiveMQ → Go RCA Engine → PostgreSQL → n8n/Telegram).
- Under **Control Center Navigation**, select one of the 4 core modules:
  1. **Live Telemetry Dashboard** (`/dashboard`)
  2. **SCADA Machine Inspector** (`/inspect`)
  3. **AI RCA Audit Log** (`/rca`)
  4. **IoT Edge Simulator** (`/simulator` or via the **⚡ Simulator Drawer** button in the top-right corner of any page)

### 2. Simulate Telemetry & Trigger Faults (IoT Simulator)
Since the platform processes live MQTT telemetry streams, you can simulate factory machines directly from your browser:
1. Click the **⚡ Simulator** button in the top-right corner (opens the *Global Simulator Drawer*) or navigate to `/simulator`.
2. Verify the simulator status is **RUNNING / PUBLISHING** (connected to the MQTT broker over WebSockets).
3. Select a target station:
   - `LINE1_STN1` (Conveyor & Packaging Line 1)
   - `LINE1_STN2` (Labeling & Stamping Line 1)
   - `LINE2_STN1` (Liquid Filling Line 2)
   - `LINE2_STN2` (Thermal Sealing Line 2)
4. **Normal vs. Fault Simulation:**
   - Under normal operation, `temperature`, `vibration`, `pressure`, and `speed` remain within safe operational thresholds.
   - **How to Trigger AI RCA:** Drag the sliders to extreme values (e.g., raise **Temperature > 85°C** to trigger an *Overheat* fault, or increase **Vibration > 8.0 mm/s** to trigger *Bearing Wear / Mechanical Looseness*), or click one of the anomaly presets.
   - *Cloud Billing Guard:* The simulator automatically pauses (*sleeps*) when the browser tab is hidden or after 5 minutes of inactivity. Click **Resume Simulation** to continue.

### 3. Monitor Telemetry & Computer Vision on the Dashboard (`/dashboard`)
Open the **Live Telemetry Dashboard** to observe production line performance:
1. **Switch Production Stations:** Click machine tabs (`LINE1_STN1`, `LINE1_STN2`, etc.) to view live Recharts graphs (Temperature, Vibration, Pressure, Speed).
2. **"Latest RCA Finding" Card:** Polls `/api/rca?limit=1` every 20 seconds to highlight the newest anomaly with its severity (`High / Medium / Low`), root cause, and recommended maintenance action.
3. **AI Visual Inspection (Roboflow Computer Vision):**
   - In the visual inspection camera panel, click **Inspect Frame / Run CV** to send a production line image frame to the **Roboflow** defect detection proxy.
   - Bounding boxes and confidence scores are rendered directly over the frame.
4. **Subscribe to Telegram Alerts:**
   - Click **Connect Telegram Bot** in the alert configuration card to open the official Telegram bot (`@BebasQcBot` or your configured bot) and send `/start` to link your session for instant anomaly notifications.

### 4. Inspect Mechanical Synoptics in SCADA View (`/inspect`)
Open the **SCADA Inspector** to visualize physical production line operations:
1. **Real-Time Animated SVG Synoptics:**
   - **Line 1:** Spinning conveyor gears synced with conveyor speed, moving boxes along the belt, and an animated pneumatic *Labeler* stamping piston.
   - **Line 2:** *Filler* tank with oscillating liquid levels and dripping nozzles filling glass bottles, followed by a thermal *Sealer* bar that glows red during sealing.
2. **Interactive Station Selection:** Click any station node directly on the SVG schematic to filter the right-hand telemetry gauges, view **Machine RCA Findings** for that station, and monitor **Live Station Alarms** at the bottom.

### 5. Audit Historical Incidents in the RCA Log (`/rca`)
Open the **RCA Audit Log** to search and analyze all AI-generated findings:
1. **Summary Pills:** View real-time counters for *Total*, *Critical (High)*, *Warning (Medium)*, and *Low* severity incidents.
2. **Search & Filter:** Search by keywords (`bearing`, `overheat`, `pressure`) or filter by `machine_id` and `severity`.
3. **Expandable Evidence Cards:** Click any card to inspect the detected **Problem**, **Root Cause**, raw **Sensor Evidence** from PostgreSQL, and the **Recommended Action**.

---

## 🐳 Running the Stack with Docker (Full-Stack Setup)

The entire **Bebas QC** ecosystem runs across **8 Docker containers** orchestrated via [`docker-compose.yml`](docker-compose.yml).

### 1. Configure `.env`
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in the environment variables in `.env`:

```env
# PostgreSQL Configuration (Local Docker)
USE_SUPABASE=false
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=bebasqc
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend & External Integrations
BACKEND_PORT=8080
TELEGRAM_BOT_USERNAME=BebasQcBot
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_your_telegram_bot_token
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_n8n_password
ROBOFLOW_API_KEY=your_roboflow_api_key
N8N_WEBHOOK_URL=http://n8n:5678/webhook/smartvision/detection
```

### 2. Start All Containers
Run the following command from the project root to build and start all services in detached mode:

```bash
docker compose up --build -d
```

### 3. Container & Port Reference

| Container Name | Service | Host → Container Port | Purpose |
| :--- | :--- | :--- | :--- |
| `bebasqc_nginx` | `nginx` | `80:80`, `443:443` | Reverse proxy, SSL termination, `/api` routing, and `/mqtt` WSS proxy |
| `bebasqc_frontend` | `frontend` | `3003:88` | React/Vite SPA served by internal Nginx |
| `bebasqc_backend` | `backend` | `8085:8080` | Go Gin REST API, MQTT Subscriber, & AI RCA Engine |
| `bebasqc_postgres` | `postgres` | `5432:5432` | PostgreSQL 16 database (auto-runs [`init.sql`](docker/postgres/init.sql) on first init) |
| `bebasqc_redis` | `redis` | `6379:6379` | Redis 7 cache for high-frequency sensor queries (10s TTL) |
| `bebasqc_hivemq` | `hivemq` | `1883:1883`, `8000:8000` | HiveMQ MQTT broker (`1883` TCP for Go backend, `8000` WS for browsers) |
| `bebasqc_n8n` | `n8n` | `5678:5678` | n8n workflow engine for automated Telegram/WhatsApp alerting |
| `bebasqc_certbot` | `certbot` | *(Internal)* | Automated Let's Encrypt SSL renewal every 12 hours |

---

## 🗄️ Database Migration Guide (Supabase ↔ Docker PostgreSQL)

Whether you are migrating **away from Supabase to Docker PostgreSQL** or **setting up/keeping your database on Supabase**, follow the options below:

### Option A: Migrate from Supabase to Docker PostgreSQL (Recommended for Docker Compose)
1. **Switch `.env` to Docker PostgreSQL:**
   Set `USE_SUPABASE=false` and `POSTGRES_HOST=postgres` in your `.env`. When `docker compose up -d` starts, the `bebasqc_postgres` container automatically executes [`docker/postgres/init.sql`](docker/postgres/init.sql) to create all required tables.
2. **(Optional) Export & Import Existing Data from Supabase:**
   If you have historical data in Supabase that you want to copy into the Docker PostgreSQL container:
   ```bash
   # 1. Dump data from your Supabase PostgreSQL URI
   pg_dump "postgresql://postgres.[PROJECT_REF]:[YOUR_SUPABASE_DB_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
     --data-only --table=public.sensor_readings --table=public.rca_results --table=public.telegram_subscriptions \
     > supabase_backup.sql

   # 2. Import the data into the running Docker PostgreSQL container
   docker exec -i bebasqc_postgres psql -U postgres -d bebasqc < supabase_backup.sql
   ```

### Option B: Use or Migrate Schema on Supabase Cloud
If you prefer to keep using **Supabase** as your database instead of the local Docker Postgres container:
1. Open your **Supabase Dashboard** → **SQL Editor** → click **New Query**, paste the schema from [`docker/postgres/init.sql`](docker/postgres/init.sql) below, and click **Run**:
   ```sql
   CREATE TABLE IF NOT EXISTS sensor_readings (
       id           SERIAL PRIMARY KEY,
       machine_id   VARCHAR(50)  NOT NULL,
       machine_type VARCHAR(50)  NOT NULL,
       temperature  FLOAT        NOT NULL,
       humidity     FLOAT        NOT NULL,
       vibration    FLOAT        NOT NULL,
       belt_speed   FLOAT        NOT NULL,
       defect_count INT          DEFAULT 0,
       fault        VARCHAR(100),
       created_at   TIMESTAMPTZ  DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS rca_results (
       id          SERIAL PRIMARY KEY,
       machine_id  VARCHAR(50)  NOT NULL,
       problem     TEXT         NOT NULL,
       cause       TEXT         NOT NULL,
       evidence    TEXT,
       action      TEXT         NOT NULL,
       severity    VARCHAR(20)  NOT NULL,
       created_at  TIMESTAMPTZ  DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS alerts (
       id          SERIAL PRIMARY KEY,
       machine_id  VARCHAR(50) NOT NULL,
       rca_id      INT         REFERENCES rca_results(id),
       sent_to     VARCHAR(50),
       sent_at     TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS telegram_subscriptions (
       container_id     VARCHAR(50) PRIMARY KEY,
       telegram_chat_id BIGINT NOT NULL,
       created_at       TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_sensor_machine_time ON sensor_readings (machine_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_rca_machine_time ON rca_results (machine_id, created_at DESC);
   ```
2. In your `.env`, configure the Supabase PostgreSQL connection (found in **Supabase Dashboard → Project Settings → Database → Connection Pooler (Session mode)**):
   ```env
   USE_SUPABASE=true
   POSTGRES_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres.your_project_ref
   POSTGRES_PASSWORD=your_supabase_db_password
   POSTGRES_DB=postgres
   POSTGRES_SSLMODE=require
   ```
   > [`services/backend/db/db.go`](services/backend/db/db.go) automatically enables `sslmode=require` whenever `USE_SUPABASE=true` or `POSTGRES_HOST` points to `supabase.com`.

---

## 🤖 Setting Up & Running n8n (Telegram Alert Automation)

The **n8n** service (`bebasqc_n8n`) receives webhook triggers from the Go backend whenever the RCA engine detects an anomaly, looks up the user's `telegram_chat_id` in PostgreSQL, and dispatches real-time alerts to Telegram.

### 1. Create a Telegram Bot & Set Token
1. Open Telegram and message **[@BotFather](https://t.me/BotFather)** → send `/newbot` and copy your **HTTP API Token**.
2. Add the token and username to `.env`:
   ```env
   TELEGRAM_BOT_USERNAME=BebasQcBot
   TELEGRAM_BOT_TOKEN=7123456789:AAHxyzYourBotTokenHere
   ```
3. Recreate `n8n` and `backend` containers:
   ```bash
   docker compose up -d n8n backend
   ```

### 2. Access the n8n Dashboard & Import Workflow
1. Open **`http://localhost:5678`** (or `https://bebasqc.geraldmanurung.site/n8n/` in production).
2. Log in with your Basic Auth credentials:
   - **Username:** `admin` (or `N8N_BASIC_AUTH_USER` in `.env`)
   - **Password:** `<your_N8N_BASIC_AUTH_PASSWORD_in_env>`
3. Click **Add Workflow** → **⋮** menu (top-right) → **Import from File...** → select **`docker/n8n/workflows/SmartVision_RCA_Workflow.json`**.
4. Toggle the workflow switch from **Inactive** to **Active**.

---
---

# 🇮🇩 Dokumentasi Bahasa Indonesia

**Bebas QC** adalah platform *Industrial AI Quality Control*, pemantauan telemetri SCADA *real-time*, dan *Root Cause Analysis* (RCA) otomatis yang dirancang untuk lini manufaktur berkecepatan tinggi. Mengusung tampilan *dark-blue industrial cockpit HMI*, platform ini menggabungkan aliran data sensor IoT via MQTT, deteksi cacat visual berbasis *Computer Vision* (Roboflow), korelasi anomali otomatis (Go + PostgreSQL + Redis), serta peringatan instan ke operator melalui n8n & Telegram Bot.

---

## 📖 Panduan Penggunaan Aplikasi (How to Use)

### 1. Mulai dari Control Hub (`/`)
Saat membuka [https://bebasqc.geraldmanurung.site](https://bebasqc.geraldmanurung.site), Anda akan berada di halaman **Control Hub**:
- Lihat ringkasan arsitektur pada diagram **Interactive Data-Flow Topology** (Sensors → HiveMQ → Go RCA Engine → PostgreSQL → n8n/Telegram).
- Di bagian **Control Center Navigation**, pilih salah satu dari 4 modul utama:
  1. **Live Telemetry Dashboard** (`/dashboard`)
  2. **SCADA Machine Inspector** (`/inspect`)
  3. **AI RCA Audit Log** (`/rca`)
  4. **IoT Edge Simulator** (`/simulator` atau tombol **⚡ Simulator Drawer** di pojok kanan atas setiap halaman)

### 2. Menjalankan Simulasi Sensor & Memicu Anomali (IoT Simulator)
Karena sistem bekerja secara *real-time* berbasis data MQTT, Anda dapat menyimulasikan mesin pabrik langsung dari browser:
1. Klik tombol **⚡ Simulator** di pojok kanan atas layar (membuka *Global Simulator Drawer*) atau buka halaman `/simulator`.
2. Pastikan status simulator adalah **RUNNING / PUBLISHING** (terhubung ke broker MQTT via WebSocket).
3. Pilih stasiun mesin yang ingin dikontrol (`LINE1_STN1`, `LINE1_STN2`, `LINE2_STN1`, `LINE2_STN2`).
4. **Cara Memicu AI RCA:** Geser *slider* ke nilai ekstrem (misalnya naikkan **Temperature > 85°C** untuk memicu *Overheat*, atau naikkan **Vibration > 8.0 mm/s** untuk memicu *Bearing Wear / Mechanical Looseness*), atau gunakan preset skenario anomali.

### 3. Memantau Grafik & Computer Vision di Dashboard (`/dashboard`)
1. **Pilih Lini & Stasiun:** Klik tab mesin untuk melihat grafik *real-time* (Temperature, Vibration, Pressure, Speed).
2. **Kartu "Latest RCA Finding":** Menampilkan temuan anomali terbaru secara otomatis setiap 20 detik lengkap dengan *Root Cause* dan rekomendasi tindakan.
3. **Inspeksi Visual AI (Roboflow Computer Vision):** Klik tombol **Inspect Frame / Run CV** untuk mendeteksi cacat produk menggunakan model **Roboflow**.
4. **Berlangganan Notifikasi Telegram:** Klik **Connect Telegram Bot** dan ketik `/start` di Telegram untuk menerima notifikasi peringatan instan.

### 4. Inspeksi Visual Mekanis di SCADA Synoptics (`/inspect`)
Klik langsung pada node stasiun di skema animasi SVG SCADA untuk memfilter metrik *gauge* di panel kanan, melihat riwayat **Machine RCA Findings** khusus mesin tersebut, serta memantau **Live Station Alarms** di bagian bawah.

### 5. Mengaudit Riwayat Kerusakan di RCA Log (`/rca`)
Cari berdasarkan kata kunci (`bearing`, `overheat`, `pressure`), filter berdasarkan mesin atau tingkat keparahan (`High`, `Medium`, `Low`), dan klik kartu RCA untuk melihat **Sensor Evidence** (data mentah database) beserta **Recommended Action**.

---

## 🐳 Panduan Menjalankan Docker (Full-Stack Setup)

Seluruh ekosistem **Bebas QC** terdiri dari **8 layanan container** yang didefinisikan di dalam [`docker-compose.yml`](docker-compose.yml).

### 1. Persiapan File `.env`
Salin template `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Isi konfigurasi variabel di dalam `.env`:

```env
# Konfigurasi PostgreSQL (Docker Lokal)
USE_SUPABASE=false
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password_db_anda
POSTGRES_DB=bebasqc
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend & Integrasi Eksternal
BACKEND_PORT=8080
TELEGRAM_BOT_USERNAME=BebasQcBot
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_token_bot_telegram_anda
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password_n8n_anda
ROBOFLOW_API_KEY=api_key_roboflow_anda
N8N_WEBHOOK_URL=http://n8n:5678/webhook/smartvision/detection
```

### 2. Menjalankan Seluruh Container

```bash
docker compose up --build -d
```

---

## 🗄️ Panduan Migrasi Database (Dari Supabase ke Docker PostgreSQL atau Tetap di Supabase)

Jika sebelumnya Anda masih menggunakan **Supabase**, Anda memiliki **2 pilihan** cara migrasi:

### Opsi 1: Pindah Penuh dari Supabase ke Docker PostgreSQL (Direkomendasikan)
Dengan menggunakan container `bebasqc_postgres` bawaan Docker Compose, Anda tidak lagi bergantung pada kuota/koneksi luar Supabase:
1. **Ubah Konfigurasi `.env`:**
   Pastikan di file `.env` Anda mengatur:
   ```env
   USE_SUPABASE=false
   POSTGRES_HOST=postgres
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=password_db_anda
   POSTGRES_DB=bebasqc
   ```
2. **Inisialisasi Skema Otomatis:**
   Saat Anda menjalankan `docker compose up -d`, container `bebasqc_postgres` akan **secara otomatis** mengeksekusi file [`docker/postgres/init.sql`](docker/postgres/init.sql) dan membuat keempat tabel (`sensor_readings`, `rca_results`, `alerts`, `telegram_subscriptions`).
   *(Jika container postgres sudah terlanjur dibuat sebelumnya dan ingin di-reset ulang agar membaca `init.sql`, jalankan `docker compose down -v && docker compose up -d`).*
3. **(Opsional) Memindahkan Isi Data Lama dari Supabase ke Docker Postgres:**
   Jika Anda ingin memindahkan riwayat data yang sudah ada di Supabase ke dalam Docker PostgreSQL lokal/VM:
   ```bash
   # 1. Export (dump) data dari Supabase menggunakan Connection URI Supabase Anda
   pg_dump "postgresql://postgres.[PROJECT_REF]:[PASSWORD_SUPABASE]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
     --data-only --table=public.sensor_readings --table=public.rca_results --table=public.telegram_subscriptions \
     > backup_supabase.sql

   # 2. Import data tersebut ke dalam container bebasqc_postgres
   docker exec -i bebasqc_postgres psql -U postgres -d bebasqc < backup_supabase.sql
   ```

### Opsi 2: Tetap Menggunakan Database Cloud Supabase (Migrasi Skema Tabel ke Supabase)
Jika Anda masih ingin menggunakan **Supabase Cloud** sebagai database utama untuk Go Backend dan n8n:
1. Buka **Supabase Dashboard** → menu **SQL Editor** → klik **New Query**.
2. Salin seluruh isi SQL dari [`docker/postgres/init.sql`](docker/postgres/init.sql) berikut lalu klik **Run**:
   ```sql
   CREATE TABLE IF NOT EXISTS sensor_readings (
       id           SERIAL PRIMARY KEY,
       machine_id   VARCHAR(50)  NOT NULL,
       machine_type VARCHAR(50)  NOT NULL,
       temperature  FLOAT        NOT NULL,
       humidity     FLOAT        NOT NULL,
       vibration    FLOAT        NOT NULL,
       belt_speed   FLOAT        NOT NULL,
       defect_count INT          DEFAULT 0,
       fault        VARCHAR(100),
       created_at   TIMESTAMPTZ  DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS rca_results (
       id          SERIAL PRIMARY KEY,
       machine_id  VARCHAR(50)  NOT NULL,
       problem     TEXT         NOT NULL,
       cause       TEXT         NOT NULL,
       evidence    TEXT,
       action      TEXT         NOT NULL,
       severity    VARCHAR(20)  NOT NULL,
       created_at  TIMESTAMPTZ  DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS alerts (
       id          SERIAL PRIMARY KEY,
       machine_id  VARCHAR(50) NOT NULL,
       rca_id      INT         REFERENCES rca_results(id),
       sent_to     VARCHAR(50),
       sent_at     TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS telegram_subscriptions (
       container_id     VARCHAR(50) PRIMARY KEY,
       telegram_chat_id BIGINT NOT NULL,
       created_at       TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE INDEX IF NOT EXISTS idx_sensor_machine_time ON sensor_readings (machine_id, created_at DESC);
   CREATE INDEX IF NOT EXISTS idx_rca_machine_time ON rca_results (machine_id, created_at DESC);
   ```
3. Ambil informasi **Connection Pooler (Session mode, Port 5432)** di **Supabase Dashboard → Project Settings → Database**, lalu masukkan ke `.env` Anda:
   ```env
   USE_SUPABASE=true
   POSTGRES_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres.id_project_supabase_anda
   POSTGRES_PASSWORD=password_database_supabase_anda
   POSTGRES_DB=postgres
   POSTGRES_SSLMODE=require
   ```
   > **Catatan:** Kode [`services/backend/db/db.go`](services/backend/db/db.go) sudah mendukung deteksi otomatis `sslmode=require` ketika `USE_SUPABASE=true` atau ketika `POSTGRES_HOST` mengarah ke domain `supabase.com` (atau Anda juga dapat langsung mengisi variabel `DATABASE_URL=postgresql://...`).

---

## 🤖 Panduan Konfigurasi & Menjalankan n8n (Telegram Alert Automation)

1. **Buat Bot Telegram di [@BotFather](https://t.me/BotFather):** Kirim `/newbot`, salin token-nya ke `TELEGRAM_BOT_TOKEN` di `.env`, lalu jalankan `docker compose up -d n8n backend`.
2. **Login ke Dashboard n8n (`http://localhost:5678`):**
   - **Username:** `admin` (atau sesuai `N8N_BASIC_AUTH_USER` di `.env`)
   - **Password:** `<sesuai_N8N_BASIC_AUTH_PASSWORD_di_env>`
3. **Import File Workflow Resmi:** Klik **Add Workflow** → ikon **⋮** (pojok kanan atas) → **Import from File...** → pilih [`docker/n8n/workflows/SmartVision_RCA_Workflow.json`](docker/n8n/workflows/SmartVision_RCA_Workflow.json).
4. **Aktifkan Workflow:** Ubah toggle **Inactive → Active** di pojok kanan atas kanvas n8n.

---

## 🔌 API Reference / Daftar Endpoint API

| Method | Endpoint | Description (EN) | Deskripsi (ID) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check (`{"status": "ok"}`) | Pemeriksaan status kesehatan layanan |
| `GET` | `/api/config` | Returns runtime frontend config (`telegram_bot_username`) | Mengambil konfigurasi runtime frontend |
| `GET` | `/api/rca` | Fetch AI RCA results (`?machine_id=LINE1_STN1&limit=100`) | Mengambil daftar hasil analisis RCA |
| `GET` | `/readings/:machine_id` | Returns recent sensor readings (Redis cached, 10s TTL) | Mengambil riwayat pembacaan sensor terbaru |
| `GET` | `/api/vision/frame` | Serves sample production line camera frames | Mengambil sampel gambar kamera lini produksi |
| `POST` | `/api/vision/roboflow` | Proxies frames to Roboflow CV Object Detection API | Mengirim frame ke Roboflow API untuk deteksi cacat |
