/**
 * BebasQC AI — Vision Defect Detector + Root Cause Analyzer (Node.js)
 *
 * Usage:
 *   const { detectDefect, analyzeRootCause } = require("./bebasqc-ai");
 *
 *   const defect = await detectDefect("path/to/bottle.jpg", "bottle");
 *   const sensors = { temp_dht: 32, humidity: 78, temp_ds: 75, distance: 14.2, vibration: 4.1 };
 *   const rca = await analyzeRootCause(defect, sensors, "bottle");
 *
 * Env vars (auto-detect):
 *   GEMINI_API_KEY    → vision + RCA  (free: https://aistudio.google.com/apikey)
 *   OPENAI_API_KEY    → vision + RCA  (paid)
 *   DEEPSEEK_API_KEY  → RCA only      (cheap, text)
 *
 * Requires Node 18+ (built-in fetch).
 */

const fs = require("fs");
const path = require("path");

const VISION_SYSTEM_PROMPT = `You are an expert quality control inspector for manufacturing.
Analyze the product image and detect any visible defects. Be strict but realistic.
Common defects: dent, scratch, label_misaligned, fill_underweight, cap_loose, contamination, color_off, crack, deformation.
If no defect, return defect_type "none" with severity "ok".

ALWAYS respond with ONLY a valid JSON object, no markdown, no prose. Schema:
{
  "defect_type": string,
  "severity": "ok"|"low"|"medium"|"high"|"critical",
  "confidence": number 0-1,
  "description": string,
  "affected_area": string
}`;

const RCA_SYSTEM_PROMPT = `You are a senior manufacturing engineer specialized in Root Cause Analysis (RCA).
You will receive (1) a visual defect detected by a vision system, (2) the most recent IoT sensor readings.

Sensors:
- temp_dht: ambient air temperature (°C)
- humidity: ambient humidity (%)
- temp_ds: machine surface temperature (°C) — high = overheating bearing/motor
- distance: ultrasonic distance to product (cm) — abnormal = misalignment or jam
- vibration: accelerometer (m/s²) — high = mechanical wear, imbalance

Use the 5-Why method. Be concise, technical, actionable.

ALWAYS respond with ONLY a valid JSON object, no markdown. Schema:
{
  "primary_cause": string,
  "contributing_factors": [string],
  "category": "machine"|"process"|"material"|"human"|"environment",
  "five_whys": [string],
  "recommendations": [string],
  "urgency": "low"|"medium"|"high"|"immediate"
}`;

function stripFences(s) {
  s = s.trim();
  if (s.startsWith("```json")) s = s.slice(7).trim();
  else if (s.startsWith("```")) s = s.slice(3).trim();
  if (s.endsWith("```")) s = s.slice(0, -3).trim();
  return s;
}

function imageToBase64(imagePath) {
  const buf = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().slice(1);
  const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[ext] || "image/jpeg";
  return { mime, b64: buf.toString("base64") };
}

// ---------- Gemini ----------

async function geminiVision(image, productType, apiKey, model = "gemini-2.0-flash") {
  let mime, b64;
  if (image.startsWith("data:")) {
    mime = image.slice(5, image.indexOf(";"));
    b64 = image.split(",", 2)[1];
  } else if (fs.existsSync(image)) {
    ({ mime, b64 } = imageToBase64(image));
  } else {
    mime = "image/jpeg"; b64 = image;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
    contents: [{ parts: [
      { text: `Inspect this ${productType} product. Return JSON only.` },
      { inline_data: { mime_type: mime, data: b64 } },
    ]}],
    generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(stripFences(data.candidates[0].content.parts[0].text));
}

async function geminiRca(defect, sensors, productType, apiKey, model = "gemini-2.0-flash") {
  const userPrompt =
    `Defect:\n${JSON.stringify(defect, null, 2)}\n\n` +
    `Sensor snapshot:\n${JSON.stringify(sensors, null, 2)}\n\n` +
    `Product: ${productType}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: RCA_SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { response_mime_type: "application/json", temperature: 0.3 },
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(stripFences(data.candidates[0].content.parts[0].text));
}

// ---------- OpenAI ----------

async function openaiVision(image, productType, apiKey, model = "gpt-4o-mini") {
  let dataUrl;
  if (image.startsWith("data:")) dataUrl = image;
  else if (fs.existsSync(image)) {
    const { mime, b64 } = imageToBase64(image);
    dataUrl = `data:${mime};base64,${b64}`;
  } else dataUrl = `data:image/jpeg;base64,${image}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        { role: "user", content: [
          { type: "text", text: `Inspect this ${productType} product. Return JSON only.` },
          { type: "image_url", image_url: { url: dataUrl } },
        ]},
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(stripFences(data.choices[0].message.content));
}

async function openaiRca(defect, sensors, productType, apiKey, model = "gpt-4o-mini") {
  const userPrompt =
    `Defect:\n${JSON.stringify(defect, null, 2)}\n\n` +
    `Sensor snapshot:\n${JSON.stringify(sensors, null, 2)}\n\n` +
    `Product: ${productType}`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: RCA_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(stripFences(data.choices[0].message.content));
}

async function deepseekRca(defect, sensors, productType, apiKey, model = "deepseek-chat") {
  const userPrompt =
    `Defect:\n${JSON.stringify(defect, null, 2)}\n\n` +
    `Sensor snapshot:\n${JSON.stringify(sensors, null, 2)}\n\n` +
    `Product: ${productType}`;
  const r = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: RCA_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(stripFences(data.choices[0].message.content));
}

// ---------- Public API ----------

async function detectDefect(image, productType = "general", provider = null) {
  provider = provider || (process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : null);
  if (provider === "gemini") return geminiVision(image, productType, process.env.GEMINI_API_KEY);
  if (provider === "openai") return openaiVision(image, productType, process.env.OPENAI_API_KEY);
  throw new Error("No vision API key. Set GEMINI_API_KEY (free) or OPENAI_API_KEY.");
}

async function analyzeRootCause(defect, sensors, productType = "general", provider = null) {
  provider = provider || (process.env.DEEPSEEK_API_KEY ? "deepseek"
    : process.env.GEMINI_API_KEY ? "gemini"
    : process.env.OPENAI_API_KEY ? "openai" : null);
  if (provider === "deepseek") return deepseekRca(defect, sensors, productType, process.env.DEEPSEEK_API_KEY);
  if (provider === "gemini") return geminiRca(defect, sensors, productType, process.env.GEMINI_API_KEY);
  if (provider === "openai") return openaiRca(defect, sensors, productType, process.env.OPENAI_API_KEY);
  throw new Error("No RCA API key. Set GEMINI_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY.");
}

module.exports = { detectDefect, analyzeRootCause, VISION_SYSTEM_PROMPT, RCA_SYSTEM_PROMPT };

// CLI
if (require.main === module) {
  (async () => {
    const img = process.argv[2];
    const pt = process.argv[3] || "bottle";
    if (!img) { console.error("Usage: node bebasqc-ai.js <image_path> [product_type]"); process.exit(1); }
    console.log(`[1/2] Vision detect on ${img}...`);
    const d = await detectDefect(img, pt);
    console.log(JSON.stringify(d, null, 2));
    console.log("\n[2/2] RCA with mock sensors...");
    const sensors = { temp_dht: 32, humidity: 78, temp_ds: 75, distance: 14.2, vibration: 4.1 };
    const rca = await analyzeRootCause(d, sensors, pt);
    console.log(JSON.stringify(rca, null, 2));
  })().catch(e => { console.error(e); process.exit(1); });
}
