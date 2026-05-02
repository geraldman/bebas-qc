# BebasQC — AI Models Package

Paket **AI model-only** untuk sistem deteksi cacat manufaktur **BebasQC**.
Berisi 2 AI agent siap pakai:

| Agent | Fungsi | Input | Output |
|---|---|---|---|
| **Vision Defect Detector** | Deteksi cacat visual dari gambar produk (botol, kemasan, dll) | Gambar (base64 / URL) + jenis produk | JSON: `defect_type`, `severity`, `confidence`, `description`, `affected_area` |
| **Root Cause Analyzer (RCA)** | Analisis akar masalah pakai metode 5-Why berdasarkan defect + data sensor IoT | Defect result + sensor snapshot (suhu, vibrasi, jarak, dll) | JSON: `primary_cause`, `5_whys`, `recommendations`, `urgency` |

## 🤖 Model Yang Dipakai

Default: **Google Gemini 2.0 Flash** (gratis 1500 req/hari di Google AI Studio).
Provider lain juga didukung: **OpenAI GPT-4o-mini**, **DeepSeek** (RCA only).

## 📦 Isi Paket

```
bebasqc-ai/
├── README.md              ← kamu di sini
├── prompts/
│   ├── vision_prompt.md   ← system prompt untuk vision detect
│   └── rca_prompt.md      ← system prompt untuk RCA
├── python/
│   ├── bebasqc_ai.py      ← library Python siap import
│   └── requirements.txt
├── nodejs/
│   ├── bebasqc-ai.js      ← library Node.js siap import
│   └── package.json
└── examples/
    ├── test_vision.py     ← contoh test vision detect
    ├── test_rca.py        ← contoh test RCA
    └── curl_examples.sh   ← contoh raw HTTP call
```

## 🚀 Quick Start (Python)

```bash
cd python
pip install -r requirements.txt
export GEMINI_API_KEY="AIzaSy..."   # dapat gratis: https://aistudio.google.com/apikey

cd ../examples
python test_vision.py path/to/bottle.jpg
python test_rca.py
```

## 🚀 Quick Start (Node.js)

```bash
cd nodejs
npm install
export GEMINI_API_KEY="AIzaSy..."
node ../examples/test_vision.js path/to/bottle.jpg
```

## 🔑 Cara Dapat API Key Gratis

1. Buka https://aistudio.google.com/apikey
2. Login dengan akun Google
3. Klik **"Create API Key"** → copy
4. Set env var: `export GEMINI_API_KEY="AIzaSy..."`

**Free tier**: 15 request/menit, 1500/hari, gratis selamanya. Cukup untuk demo + testing.

## 🔌 Integrasi ke Aplikasi Lain

Library ini **stateless** — tinggal panggil function dengan input yang sesuai, dapet JSON balik. Cocok untuk:
- Backend REST API (Flask/FastAPI/Express)
- Worker queue (Celery, BullMQ)
- Edge functions
- Script batch processing

Lihat `examples/` untuk contoh lengkap.

## 📝 Lisensi

Free to use. Bagian dari project BebasQC — Smart Vision-AI for Industrial QC.
