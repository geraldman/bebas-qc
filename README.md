# BebasQC — Standalone (run di workspace sendiri)

IoT + AI Defect Detection + RCA. Frontend: TanStack Start + React + Tailwind. Backend: Supabase (DB + Edge Functions).

## 1. Setup Supabase project (gratis di supabase.com)

1. Buat project baru di https://supabase.com
2. SQL Editor → jalankan isi file `supabase/migrations/*.sql` (bikin tabel `detections` + `sensor_logs`)
3. Project Settings → API → copy `Project URL` dan `anon public key`

## 2. Environment variables

Bikin file `.env` di root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...   # anon key
VITE_SUPABASE_PROJECT_ID=xxxxx
```

## 3. Install & run

```bash
bun install   # atau: npm install
bun dev       # buka http://localhost:8080
```

## 4. Deploy edge functions (untuk fitur AI Detect & RCA)

Install Supabase CLI: https://supabase.com/docs/guides/cli

```bash
supabase login
supabase link --project-ref <PROJECT_ID_KAMU>

# Set API key — pilih SALAH SATU (urutan prioritas: GEMINI > OPENAI > DEEPSEEK)
supabase secrets set GEMINI_API_KEY=...        # https://aistudio.google.com/apikey  (RECOMMENDED, free tier, support vision)
# atau
supabase secrets set OPENAI_API_KEY=...        # https://platform.openai.com/api-keys
# DeepSeek hanya untuk RCA (tidak support vision):
supabase secrets set DEEPSEEK_API_KEY=...

# Deploy
supabase functions deploy detect-defect --no-verify-jwt
supabase functions deploy root-cause --no-verify-jwt
```

## 5. Tes ESP32 (optional)

Dashboard → toggle "Live MQTT". ESP32 publish JSON ke topic `iot/smartvision` di broker `broker.hivemq.com:8884` (WSS).

Format payload:
```json
{ "temp_dht": 28.5, "humidity": 65, "temp_ds": 45.2, "distance": 30, "vibration": 1.2 }
```

## Halaman

- `/` — Dashboard sensor real-time + anomaly alerts
- `/detect` — Upload foto produk → AI defect detection
- `/rca` — Root cause analysis 5-Why
- `/history` — Riwayat deteksi (dari Supabase)

## Catatan

- **Gemini** direkomendasikan: gratis tier-nya, support vision untuk `/detect`.
- **DeepSeek** murah, tapi tidak support vision → hanya RCA (`/rca`) yang jalan.
- Untuk **OpenAI**, gunakan `gpt-4o-mini` (sudah dikonfigurasi di edge function).
- Edit prompt AI di `supabase/functions/*/index.ts` lalu redeploy.
- Untuk ganti backend ke self-hosted (Postgres + Mosquitto + Python API), set `VITE_BACKEND_MODE=bebasqc` (lihat `src/lib/config.ts`).
