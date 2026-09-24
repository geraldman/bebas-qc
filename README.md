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
   - *Catatan Hemat Cloud (Billing Guard):* Simulator otomatis jeda (*sleep*) jika tab tidak aktif atau tidak ada interaksi selama 5 menit. Klik **Resume Simulation** jika ingin melanjutkan.

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
Setelah berjalan, Anda dapat memeriksa status seluruh container dengan `docker compose ps`:

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
1. Di halaman utama n8n, klik **Add Workflow** (atau klik ikon menu **⋮** di pojok kanan atas).
2. Pilih **Import from File...**.
3. Pilih file **`docker/n8n/workflows/SmartVision_RCA_Workflow.json`** dari komputer Anda.
4. Anda akan melihat 2 jalur workflow otomatis:
   - **Jalur 1 — Pendaftaran Bot (`Telegram Trigger` → `Is Start Command?` → `Save Subscription` → `Confirm Link`)**:
     Menangkap pesan `/start <container_id>` dari pengguna di Telegram, lalu menyimpan pasangan `container_id` dan `telegram_chat_id` ke tabel `telegram_subscriptions` di PostgreSQL.
   - **Jalur 2 — Pengiriman Alert RCA (`SmartVision RCA INPUT` Webhook → `Query Telegram Subscription` → `Is Subscribed?` → `TELEGRAM ALERT`)**:
     Menerima HTTP `POST` di endpoint `/webhook/smartvision/detection` dari Go Backend saat terjadi anomali, mencari `telegram_chat_id` di database, dan mengirimkan rincian *Problem*, *Root Cause*, *Severity*, serta *Recommended Action* ke Telegram pengguna.

### 4. Mengaktifkan Workflow & Menguji Alert
1. Pastikan setiap node (`Postgres` dan `Telegram`) di dalam kanvas n8n tidak menampilkan tanda seru merah. Jika diminta memilih credential, pilih credential **Postgres connection** (`host: postgres`, `db: bebasqc`) dan **Telegram Bot API**.
2. Klik tombol toggle **Inactive → Active** di pojok kanan atas kanvas n8n agar webhook *Production URL* aktif mendengarkan request.
3. **Cara Menguji End-to-End:**
   - Buka **Dashboard** (`http://localhost/dashboard`), lalu klik tombol **Connect Telegram Bot**.
   - Aplikasi Telegram akan terbuka dan mengirim `/start <container_id>`. Bot akan membalas: `✅ Link Successful!`.
   - Buka **⚡ Simulator Drawer**, naikkan **Temperature** ke `95°C` atau **Vibration** ke `9.5 mm/s`.
   - Dalam beberapa detik, Go Backend (`services/backend/mqtt/alert.go`) akan memicu webhook n8n dan Anda akan menerima pesan **🚨 SMARTVISION RCA ALERT 🚨** di Telegram!

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

## 🔄 CI/CD & Deployment Produksi

Setiap `git push` ke branch `main` akan memicu pipeline GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):
1. **Deteksi Perubahan**: Mendeteksi apakah perubahan terjadi pada `services/backend`, `services/frontend`, atau konfigurasi infrastruktur.
2. **Build & Push Image**: Membangun Docker image multi-stage dan mengunggahnya ke GitHub Container Registry (`ghcr.io/geraldman/bebas-qc`).
3. **Auto-Deploy ke GCP VM**: Terhubung melalui SSH ke server produksi, membersihkan volume database agar skema selalu segar sesuai [`init.sql`](docker/postgres/init.sql), menarik image terbaru, menjalankan `docker compose up -d`, dan memverifikasi endpoint `/api/health`.
