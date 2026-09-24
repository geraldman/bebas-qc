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
        PG[("PostgreSQL 16 (Sensor & RCA DB)")]
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
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bebasqc
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend & External Integrations
BACKEND_PORT=8080
TELEGRAM_BOT_USERNAME=BebasQcBot
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_your_telegram_bot_token
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

### 4. Useful Docker Commands

```bash
# Stream logs from all services (or filter by backend / n8n)
docker compose logs -f
docker compose logs -f backend n8n

# Restart a specific service after config changes
docker compose restart backend

# Stop all containers without deleting persistent volumes
docker compose down

# Stop all containers AND wipe database volumes (re-initializes init.sql)
docker compose down -v
docker compose up --build -d
```

---

## 🤖 Setting Up & Running n8n (Telegram Alert Automation)

The **n8n** service (`bebasqc_n8n`) receives webhook triggers from the Go backend whenever the RCA engine detects an anomaly, looks up the user's `telegram_chat_id` in PostgreSQL, and dispatches real-time alerts to Telegram.

### 1. Create a Telegram Bot & Set Token
1. Open Telegram and message **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot`, follow the prompts, and copy your **HTTP API Token**.
3. Add the token and username to `.env`:
   ```env
   TELEGRAM_BOT_USERNAME=BebasQcBot
   TELEGRAM_BOT_TOKEN=7123456789:AAHxyzYourBotTokenHere
   ```
4. Recreate `n8n` and `backend` containers so the environment changes take effect:
   ```bash
   docker compose up -d n8n backend
   ```
   > **Note:** `CREDENTIALS_OVERWRITE_DATA` in [`docker-compose.yml`](docker-compose.yml) automatically injects your PostgreSQL credentials and `TELEGRAM_BOT_TOKEN` into n8n.

### 2. Access the n8n Dashboard
1. Open **`http://localhost:5678`** in your browser (or `https://bebasqc.geraldmanurung.site/n8n/` in production).
2. Log in with the default Basic Auth credentials defined in [`docker-compose.yml`](docker-compose.yml):
   - **Username:** `admin`
   - **Password:** `bebasqc123`

### 3. Import the Official Workflow (`SmartVision_RCA_Workflow.json`)
A ready-to-use workflow file is included at [`docker/n8n/workflows/SmartVision_RCA_Workflow.json`](docker/n8n/workflows/SmartVision_RCA_Workflow.json):
1. Inside n8n, click **Add Workflow** → click the **⋮** menu (top-right) → select **Import from File...**.
2. Select **`docker/n8n/workflows/SmartVision_RCA_Workflow.json`**.
3. The imported workflow contains two automated pipelines:
   - **Pipeline 1 — Bot Subscription (`Telegram Trigger` → `Is Start Command?` → `Save Subscription` → `Confirm Link`)**: Captures `/start <container_id>` messages sent to the Telegram bot and stores `(container_id, telegram_chat_id)` in PostgreSQL (`telegram_subscriptions` table).
   - **Pipeline 2 — RCA Webhook Dispatch (`SmartVision RCA INPUT` → `Query Telegram Subscription` → `Is Subscribed?` → `TELEGRAM ALERT`)**: Listens for `POST /webhook/smartvision/detection` payloads from the Go backend and sends formatted Markdown alerts to the subscribed Telegram user.

### 4. Activate & Test End-to-End
1. Toggle the workflow status switch in the top-right corner from **Inactive** to **Active**.
2. Open the **Dashboard** (`http://localhost/dashboard`) and click **Connect Telegram Bot**, then press **Start** in Telegram.
3. Open the **⚡ Simulator Drawer**, push **Temperature** above `90°C`, and receive the **🚨 SMARTVISION RCA ALERT 🚨** message on Telegram within seconds!

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
3. Pilih stasiun mesin yang ingin dikontrol:
   - `LINE1_STN1` (Conveyor & Packaging Line 1)
   - `LINE1_STN2` (Labeling & Stamping Line 1)
   - `LINE2_STN1` (Liquid Filling Line 2)
   - `LINE2_STN2` (Thermal Sealing Line 2)
4. **Simulasi Normal vs. Fault (Kerusakan):**
   - Dalam kondisi normal, suhu (`temperature`), getaran (`vibration`), tekanan (`pressure`), dan kecepatan (`speed`) berada di rentang aman.
   - **Cara Memicu AI RCA:** Geser *slider* ke nilai ekstrem (misalnya naikkan **Temperature > 85°C** untuk memicu *Overheat*, atau naikkan **Vibration > 8.0 mm/s** untuk memicu *Bearing Wear / Mechanical Looseness*), atau gunakan preset skenario anomali pada simulator.
   - *Catatan Hemat Cloud (Billing Guard):* Simulator otomatis jeda (*sleep*) jika tab tidak aktif atau tidak ada interaksi selama 5 menit. Klik **Resume Simulation** jika ingin melanjutkan.

### 3. Memantau Grafik & Computer Vision di Dashboard (`/dashboard`)
Buka halaman **Live Telemetry Dashboard** untuk memantau kondisi lini produksi:
1. **Pilih Lini & Stasiun:** Klik tab mesin (`LINE1_STN1`, `LINE1_STN2`, dll.) untuk melihat grafik *real-time* (Temperature, Vibration, Pressure, Speed).
2. **Kartu "Latest RCA Finding":** Menampilkan temuan anomali terbaru secara otomatis setiap 20 detik lengkap dengan tingkat keparahan (*High / Medium / Low*), penyebab (*Root Cause*), dan rekomendasi tindakan.
3. **Inspeksi Visual AI (Roboflow Computer Vision):**
   - Pada panel kamera inspeksi visual, klik tombol **Inspect Frame / Run CV** untuk mengirim gambar produk dari lini berjalan ke model deteksi cacat **Roboflow**.
   - Hasil deteksi (*bounding box* & skor *confidence*) akan ditampilkan langsung di layar.
4. **Berlangganan Notifikasi Telegram:**
   - Klik tombol **Connect Telegram Bot** di bagian konfigurasi alert untuk membuka bot Telegram resmi (`@BebasQcBot` atau sesuai konfigurasi `.env`) dan ketik `/start` agar Anda menerima pesan peringatan instan setiap kali anomali terdeteksi.

### 4. Inspeksi Visual Mekanis di SCADA Synoptics (`/inspect`)
Buka halaman **SCADA Inspector** untuk melihat visualisasi fisik pabrik secara langsung:
1. **Animasi SCADA Real-Time:**
   - **Line 1:** Roda gigi konveyor berputar mengikuti kecepatan (`speed`), kotak paket berjalan di atas sabuk, dan lengan piston *Labeler* bergerak menempelkan label.
   - **Line 2:** Tangki cairan (*Filler*) menampilkan level cairan yang berosilasi dengan tetesan pengisian ke botol kaca, diikuti pemanas *Sealer* pneumatik yang menyala merah saat menyegel.
2. **Klik Node Stasiun pada Diagram SVG:** Klik langsung pada gambar stasiun di skema SCADA untuk memfilter metrik *gauge* di panel kanan, melihat riwayat **Machine RCA Findings** khusus mesin tersebut, serta memantau **Live Station Alarms** di bagian bawah.

### 5. Mengaudit Riwayat Kerusakan di RCA Log (`/rca`)
Buka halaman **RCA Audit Log** untuk menelusuri seluruh hasil analisis AI:
1. **Ringkasan Status:** Lihat jumlah total insiden, *Critical (High)*, *Warning (Medium)*, dan *Low* pada indikator di bagian atas.
2. **Pencarian & Filter:** Ketik kata kunci di kolom pencarian (`bearing`, `overheat`, `pressure`) atau filter berdasarkan mesin (`LINE1_STN1`, dsb.) dan tingkat keparahan (`High`, `Medium`, `Low`).
3. **Detail Bukti & Rekomendasi:** Klik pada salah satu kartu RCA untuk membuka detail lengkap yang mencakup **Problem**, **Root Cause**, **Sensor Evidence** (data mentah database), dan **Recommended Action**.

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
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bebasqc
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend & External Integrations
BACKEND_PORT=8080
TELEGRAM_BOT_USERNAME=BebasQcBot
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_your_telegram_bot_token
ROBOFLOW_API_KEY=your_roboflow_api_key
N8N_WEBHOOK_URL=http://n8n:5678/webhook/smartvision/detection
```

### 2. Menjalankan Seluruh Container
Jalankan perintah berikut di direktori utama proyek untuk mem-build dan menyalakan semua container di *background*:

```bash
docker compose up --build -d
```

### 3. Daftar Container & Port Mapping

| Nama Container | Service | Port Host → Container | Deskripsi Fungsi |
| :--- | :--- | :--- | :--- |
| `bebasqc_nginx` | `nginx` | `80:80`, `443:443` | Reverse proxy utama, SSL, routing `/api` & WebSocket `/mqtt` |
| `bebasqc_frontend` | `frontend` | `3003:88` | Aplikasi React/Vite SPA (di-serve oleh Nginx internal) |
| `bebasqc_backend` | `backend` | `8085:8080` | Go Gin REST API, MQTT Subscriber, & AI RCA Engine |
| `bebasqc_postgres` | `postgres` | `5432:5432` | Database PostgreSQL 16 (otomatis menjalankan [`init.sql`](docker/postgres/init.sql)) |
| `bebasqc_redis` | `redis` | `6379:6379` | Redis 7 Cache untuk pembacaan sensor kecepatan tinggi |
| `bebasqc_hivemq` | `hivemq` | `1883:1883`, `8000:8000` | Broker MQTT (TCP `1883` untuk Backend, WS `8000` untuk Browser) |
| `bebasqc_n8n` | `n8n` | `5678:5678` | Mesin workflow otomasi untuk pengiriman alert Telegram/WhatsApp |
| `bebasqc_certbot` | `certbot` | *(Internal)* | Perpanjangan otomatis sertifikat SSL Let's Encrypt setiap 12 jam |

### 4. Perintah Docker Berguna (Troubleshooting & Maintenance)

```bash
# Melihat log real-time dari semua layanan (atau spesifik backend/n8n)
docker compose logs -f
docker compose logs -f backend n8n

# Me-restart satu layanan setelah mengubah konfigurasi
docker compose restart backend

# Menghentikan seluruh container tanpa menghapus data
docker compose down

# Menghentikan container DAN mereset ulang database PostgreSQL dari awal (init.sql)
docker compose down -v
docker compose up --build -d
```

---

## 🤖 Panduan Konfigurasi & Menjalankan n8n (Telegram Alert Automation)

Layanan **n8n** (`bebasqc_n8n`) bertugas menerima *webhook* dari Go Backend setiap kali mesin RCA mendeteksi anomali, mencocokkan `container_id` pengguna dengan `telegram_chat_id` di PostgreSQL, lalu mengirimkan pesan peringatan ke Telegram operator.

### 1. Membuat Bot Telegram & Mengatur Token
1. Buka aplikasi Telegram dan cari **[@BotFather](https://t.me/BotFather)**.
2. Kirim perintah `/newbot`, tentukan nama serta username bot (contoh: `BebasQcBot`).
3. Salin **HTTP API Token** yang diberikan oleh BotFather, lalu masukkan ke dalam file `.env`:
   ```env
   TELEGRAM_BOT_USERNAME=BebasQcBot
   TELEGRAM_BOT_TOKEN=7123456789:AAHxyzYourBotTokenHere
   ```
4. Restart container `n8n` dan `backend` agar token terbaca:
   ```bash
   docker compose up -d n8n backend
   ```
   > **Info:** Di dalam [`docker-compose.yml`](docker-compose.yml), variabel `CREDENTIALS_OVERWRITE_DATA` sudah dikonfigurasi agar n8n secara otomatis mengenali koneksi database `postgres` dan `TELEGRAM_BOT_TOKEN` dari `.env`.

### 2. Login ke Dashboard n8n
1. Buka browser dan akses **`http://localhost:5678`** (atau `https://bebasqc.geraldmanurung.site/n8n/` di server produksi).
2. Masukkan kredensial *Basic Auth* default (sesuai konfigurasi di [`docker-compose.yml`](docker-compose.yml)):
   - **Username:** `admin`
   - **Password:** `bebasqc123`

### 3. Import File Workflow Resmi (`SmartVision_RCA_Workflow.json`)
Proyek ini sudah menyediakan template workflow n8n siap pakai di [`docker/n8n/workflows/SmartVision_RCA_Workflow.json`](docker/n8n/workflows/SmartVision_RCA_Workflow.json):
1. Di halaman utama n8n, klik **Add Workflow** (atau klik ikon menu **⋮** di pojok kanan atas) → pilih **Import from File...**.
2. Pilih file **`docker/n8n/workflows/SmartVision_RCA_Workflow.json`**.
3. Anda akan melihat 2 jalur workflow otomatis:
   - **Jalur 1 — Pendaftaran Bot (`Telegram Trigger` → `Is Start Command?` → `Save Subscription` → `Confirm Link`)**: Menangkap pesan `/start <container_id>` dari pengguna di Telegram dan menyimpan pasangan `container_id` dan `telegram_chat_id` ke tabel `telegram_subscriptions` di PostgreSQL.
   - **Jalur 2 — Pengiriman Alert RCA (`SmartVision RCA INPUT` Webhook → `Query Telegram Subscription` → `Is Subscribed?` → `TELEGRAM ALERT`)**: Menerima HTTP `POST` di endpoint `/webhook/smartvision/detection` dari Go Backend saat terjadi anomali dan mengirimkan rincian *Problem*, *Root Cause*, *Severity*, serta *Recommended Action* ke Telegram pengguna.

### 4. Mengaktifkan Workflow & Menguji Alert
1. Klik tombol toggle **Inactive → Active** di pojok kanan atas kanvas n8n agar webhook *Production URL* aktif mendengarkan request.
2. Buka **Dashboard** (`http://localhost/dashboard`), klik tombol **Connect Telegram Bot**, lalu tekan **Start** di Telegram.
3. Buka **⚡ Simulator Drawer**, naikkan **Temperature** ke `95°C` atau **Vibration** ke `9.5 mm/s`, dan pesan **🚨 SMARTVISION RCA ALERT 🚨** akan langsung masuk ke Telegram Anda!

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
