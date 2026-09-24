# Bebas QC — Industrial AI Quality Control Platform

[![Live Production](https://img.shields.io/badge/Live_Demo-bebasqc.geraldmanurung.site-00cfff?style=for-the-badge&logo=googlecloud&logoColor=white)](https://bebasqc.geraldmanurung.site)
[![Go](https://img.shields.io/badge/Backend-Go_1.22_(Gin)-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![React](https://img.shields.io/badge/Frontend-React_+_TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MQTT](https://img.shields.io/badge/Broker-HiveMQ_CE-ffb800?style=for-the-badge&logo=mqtt&logoColor=black)](https://www.hivemq.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**Bebas QC** adalah platform *Industrial AI Quality Control*, pemantauan telemetri SCADA *real-time*, dan *Root Cause Analysis* (RCA) otomatis yang dirancang untuk lini manufaktur berkecepatan tinggi. Mengusung tampilan *dark-blue industrial cockpit HMI*, platform ini menggabungkan aliran data sensor IoT via MQTT, deteksi cacat visual berbasis *Computer Vision* (Roboflow), korelasi anomali otomatis (Go + PostgreSQL + Redis), serta peringatan instan ke operator melalui n8n & Telegram Bot.

🌐 **Live Production URL:** [https://bebasqc.geraldmanurung.site](https://bebasqc.geraldmanurung.site)

---

## 📖 Panduan Penggunaan Aplikasi (How to Use)

Berikut adalah alur lengkap penggunaan **Bebas QC** dari simulasi sensor hingga analisis akar masalah (RCA) dan notifikasi Telegram:

### 1. Mulai dari Control Hub (`/`)
Saat membuka [https://bebasqc.geraldmanurung.site](https://bebasqc.geraldmanurung.site), Anda akan berada di halaman **Control Hub**:
- Lihat ringkasan arsitektur pada diagram **Interactive Data-Flow Topology** (Sensors → HiveMQ → Go RCA Engine → PostgreSQL → n8n/Telegram).
- Di bagian **Control Center Navigation**, pilih salah satu dari 4 modul utama:
  1. **Live Telemetry Dashboard** (`/dashboard`)
  2. **SCADA Machine Inspector** (`/inspect`)
  3. **AI RCA Audit Log** (`/rca`)
  4. **IoT Edge Simulator** (`/simulator` atau tombol **⚡ Simulator Drawer** di pojok kanan atas setiap halaman)

---

### 2. Menjalankan Simulasi Sensor & Memicu Anomali (IoT Simulator)
Karena sistem bekerja secara *real-time* berbasis data MQTT, Anda dapat menyimulasikan mesin pabrik langsung dari browser:
1. Klik tombol **⚡ Simulator** di pojok kanan atas layar (membuka *Global Simulator Drawer*) atau buka halaman `/simulator`.
2. Pastikan status simulator adalah **RUNNING / PUBLISHING** (terhubung ke broker MQTT via WebSocket).
3. Pilih stasiun mesin yang ingin dikontrol, misalnya:
   - `LINE1_STN1` (Conveyor & Packaging Line 1)
   - `LINE1_STN2` (Labeling & Stamping Line 1)
   - `LINE2_STN1` (Liquid Filling Line 2)
   - `LINE2_STN2` (Thermal Sealing Line 2)
4. **Simulasi Normal vs. Fault (Kerusakan):**
   - Dalam kondisi normal, suhu (`temperature`), getaran (`vibration`), tekanan (`pressure`), dan kecepatan (`speed`) berada di rentang aman.
   - **Cara Memicu AI RCA:** Geser *slider* ke nilai ekstrem (misalnya naikkan **Temperature > 85°C** untuk memicu *Overheat*, atau naikkan **Vibration > 8.0 mm/s** untuk memicu *Bearing Wear / Mechanical Looseness*), atau gunakan preset skenario anomali pada simulator.
   -*Catatan Hemat的资源 (Billing Guard):* Simulator otomatis jeda (*sleep*) jika tab tidak aktif atau tidak ada interaksi selama 5 menit. Klik **Resume Simulation** jika ingin melanjutkan.

---

### 3. Memantau Grafik & Computer Vision di Dashboard (`/dashboard`)
Buka halaman **Live Telemetry Dashboard** untuk memantau kondisi lini produksi:
1. **Pilih Lini & Stasiun:** Klik tab mesin (`LINE1_STN1`, `LINE1_STN2`, dll.) untuk melihat grafik *real-time* (Temperature, Vibration, Pressure, Speed).
2. **Kartu "Latest RCA Finding":** Menampilkan temuan anomali terbaru secara otomatis setiap 20 detik lengkap dengan tingkat keparahan (*High / Medium / Low*), penyebab (*Root Cause*), dan rekomendasi tindakan.
3. **Inspeksi Visual AI (Roboflow Computer Vision):**
   - Pada panel kamera inspeksi visual, klik tombol **Inspect Frame / Run CV** untuk mengirim gambar produk dari lini berjalan ke model deteksi cacat **Roboflow**.
   - Hasil deteksi (*bounding box* & skor *confidence*) akan ditampilkan langsung di layar.
4. **Berlangganan Notifikasi Telegram:**
   - Klik tombol **Connect Telegram Bot** di bagian konfigurasi alert untuk membuka bot Telegram resmi (`@BebasQcBot` atau sesuai konfigurasi `.env`) dan ketik `/start` agar Anda menerima pesan peringatan instan setiap kali anomali terdeteksi.

---

### 4. Inspeksi Visual Mekanis di SCADA Synoptics (`/inspect`)
Buka halaman **SCADA Inspector** untuk melihat visualisasi fisik pabrik secara langsung:
1. **Animasi SCADA Real-Time:**
   - **Line 1:** Roda gigi konveyor berputar mengikuti kecepatan (`speed`), kotak paket berjalan di atas sabuk, dan lengan piston *Labeler* bergerak menempelkan label.
   - **Line 2:** Tangki cairan (*Filler*) menampilkan level cairan yang berosilasi dengan tetesan pengisian ke botol kaca, diikuti pemanas *Sealer* pneumatik yang menyala merah saat menyegel.
2. **Klik Node Stasiun pada Diagram SVG:** Klik langsung pada gambar stasiun di skema SCADA untuk memfilter metrik *gauge* di panel kanan, melihat riwayat **Machine RCA Findings** khusus mesin tersebut, serta memantau **Live Station Alarms** di bagian bawah.

---

### 5. Mengaudit Riwayat Kerusakan di RCA Log (`/rca`)
Buka halaman **RCA Audit Log** untuk menelusuri seluruh hasil analisis AI:
1. **Ringkasan Status:** Lihat jumlah total insiden, *Critical (High)*, *Warning (Medium)*, dan *Low* pada indikator di bagian atas.
2. **Pencarian & Filter:**
   - Ketik kata kunci di kolom pencarian (contoh: `bearing`, `overheat`, `pressure`).
   - Filter berdasarkan mesin (`LINE1_STN1`, dsb.) atau tingkat keparahan (`High`, `Medium`, `Low`).
3. **Detail Bukti & Rekomendasi:** Klik pada salah satu kartu RCA untuk membuka detail lengkap yang mencakup:
   - **Problem:** Gejala anomali yang terdeteksi.
   - **Root Cause:** Analisis penyebab utama kerusakan.
   - **Sensor Evidence:** Data mentah telemetri dari database saat kejadian.
   - **Recommended Action:** Instruksi langkah perbaikan untuk teknisi/operator.

---

## ✨ Fitur Utama Sistem

- **🎛️ Control Hub (`/`)**: Portal kendali utama dengan diagram topologi aliran data SVG interaktif dan metrik efisiensi lini produksi.
- **📊 Live Telemetry Dashboard (`/dashboard`)**: Grafik sensor MQTT *real-time*, kartu RCA terbaru, proxy kamera Computer Vision Roboflow, dan integrasi Telegram Bot.
- **🏭 Interactive SCADA Inspector (`/inspect`)**: Diagram sinoptik SVG animasi presisi tinggi dengan log alarm dan panel diagnostik per mesin.
- **🔍 AI Root Cause Analysis Audit Log (`/rca`)**: Pencarian teks penuh, filter multi-kriteria, *auto-refresh* 15 detik, dan kartu diagnostik yang dapat diperluas.
- **⚡ Edge IoT Telemetry Simulator (`/simulator`)**: Publisher paket MQTT langsung dari browser lengkap dengan pengaman *idle sleep* 5 menit dan batas sesi 30 menit.

---

## 🏗️ Arsitektur Sistem

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

## 🛠️ Tech Stack

| Layer | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS | Antarmuka SCADA HMI, animasi SVG Synoptics, grafik Recharts |
| **Backend** | Go 1.22, Gin Web Framework, Paho MQTT | Ingesti MQTT, mesin korelasi RCA, REST API |
| **Database** | PostgreSQL 16 (Alpine) | Penyimpanan permanen `sensor_readings`, `rca_results`, dan langganan alert |
| **Cache** | Redis 7 (Alpine) | Caching latensi rendah untuk pembacaan sensor frekuensi tinggi (TTL 10s) |
| **MQTT Broker** | HiveMQ Community Edition | Broker pub/sub telemetri via TCP (`1883`) dan WebSocket (`8000`) |
| **Automation** | n8n + Telegram Bot API | Otomasi pengiriman peringatan insiden kritis ke Telegram |
| **Reverse Proxy** | Nginx (Alpine) + Certbot | Terminasi SSL (Let's Encrypt), routing `/api`, dan proxy WebSocket `/mqtt` |
| **CI/CD** | GitHub Actions, GHCR, GCP Compute Engine | Build Docker otomatis, push ke GHCR, dan *deployment* SSH ke VM produksi |

---

## 🔌 Daftar Endpoint API

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Pemeriksaan status kesehatan layanan (`{"status": "ok"}`) |
| `GET` | `/api/config` | Mengambil konfigurasi runtime frontend (seperti `telegram_bot_username`) |
| `GET` | `/api/rca` | Mengambil daftar hasil analisis RCA. Mendukung query `?machine_id=LINE1_STN1&limit=100` |
| `GET` | `/readings/:machine_id` | Mengambil riwayat pembacaan sensor mesin terbaru (di-cache di Redis selama 10 detik) |
| `GET` | `/api/vision/frame` | Mengambil sampel gambar kamera lini produksi untuk inspeksi visual |
| `POST` | `/api/vision/roboflow` | Mengirim frame gambar ke Roboflow Object Detection API dan mengembalikan hasil prediksi |

---

## 🚀 Instalasi & Menjalankan di Lokal

### Prasyarat

- **Docker & Docker Compose** (direkomendasikan untuk menjalankan seluruh layanan sekaligus)
- **Go 1.22+** & **Node.js 20+** (opsional, jika ingin menjalankan backend/frontend tanpa Docker)

### 1. Konfigurasi Environment Variable

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Sesuaikan nilai variabel di dalam `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bebasqc
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
BACKEND_PORT=8080

TELEGRAM_BOT_USERNAME=BebasQcBot
ROBOFLOW_API_KEY=your_roboflow_key
```

### 2. Menjalankan Full Stack dengan Docker Compose

```bash
docker compose up --build -d
```

Setelah seluruh container berjalan, akses layanan melalui browser:

- **Aplikasi Web Utama (via Nginx)**: `http://localhost`
- **Frontend Langsung**: `http://localhost:3000`
- **Backend API Health Check**: `http://localhost:8080/api/health`
- **HiveMQ WebSocket Broker**: `ws://localhost:8000/mqtt`
- **n8n Workflow UI**: `http://localhost:5678`

### 3. Menjalankan Secara Terpisah (Local Dev Mode)

**Backend (Go):**
```bash
cd services/backend
go mod download
go run ./cmd/main.go
```

**Frontend (Vite):**
```bash
cd services/frontend
npm install
npm run dev
```

---

## 🔄 CI/CD & Deployment Produksi

Setiap `git push` ke branch `main` akan memicu pipeline GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):
1. **Deteksi Perubahan**: Mendeteksi apakah perubahan terjadi pada `services/backend`, `services/frontend`, atau konfigurasi infrastruktur.
2. **Build & Push Image**: Membangun Docker image multi-stage dan mengunggahnya ke GitHub Container Registry (`ghcr.io/geraldman/bebas-qc`).
3. **Auto-Deploy ke GCP VM**: Terhubung melalui SSH ke server produksi, membersihkan volume database agar skema selalu segar sesuai [`init.sql`](docker/postgres/init.sql), menarik image terbaru, menjalankan `docker compose up -d`, dan memverifikasi endpoint `/api/health`.
