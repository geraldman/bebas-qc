import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL_SCHEMA = {
  name: "report_defect",
  description: "Report defect detection result",
  parameters: {
    type: "object",
    properties: {
      defect_type: { type: "string" },
      severity: { type: "string", enum: ["ok", "low", "medium", "high", "critical"] },
      confidence: { type: "number" },
      description: { type: "string" },
      affected_area: { type: "string" },
    },
    required: ["defect_type", "severity", "confidence", "description", "affected_area"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, productType } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 required" }, 400);

    const systemPrompt = `You are an expert QC inspector for ${productType || "general packaging/bottles"}.
Detect visible defects (dent, scratch, label_misaligned, fill_underweight, cap_loose, contamination, color_off, crack, deformation).
If none, return defect_type "none" with severity "ok". Always return strict JSON matching the schema.`;

    const GEMINI = Deno.env.get("GEMINI_API_KEY");
    const OPENAI = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");

    if (GEMINI) return await callGemini(GEMINI, systemPrompt, imageBase64);
    if (OPENAI) return await callOpenAICompat("https://api.openai.com/v1/chat/completions", OPENAI, "gpt-4o-mini", systemPrompt, imageBase64);
    if (LOVABLE) return await callOpenAICompat("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE, "google/gemini-2.5-flash", systemPrompt, imageBase64);
    return json({ error: "No AI key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in edge function secrets." }, 500);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function callGemini(key: string, systemPrompt: string, imageBase64: string) {
  // Strip data URL prefix
  const m = imageBase64.match(/^data:(.+?);base64,(.+)$/);
  const mimeType = m?.[1] ?? "image/jpeg";
  const data = m?.[2] ?? imageBase64;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: "user",
          parts: [
            { text: "Inspect this product. Return structured defect analysis via the function." },
            { inline_data: { mime_type: mimeType, data } },
          ],
        }],
        tools: [{ functionDeclarations: [TOOL_SCHEMA] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["report_defect"] } },
      }),
    },
  );
  if (!res.ok) return json({ error: `Gemini error: ${await res.text()}` }, 500);
  const data2 = await res.json();
  const fc = data2.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
  if (!fc) return json({ error: "No structured response from Gemini" }, 500);
  return json(fc.args);
}

async function callOpenAICompat(url: string, key: string, model: string, systemPrompt: string, imageBase64: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: [
          { type: "text", text: "Inspect this product. Return structured defect analysis." },
          { type: "image_url", image_url: { url: imageBase64 } },
        ]},
      ],
      tools: [{ type: "function", function: TOOL_SCHEMA }],
      tool_choice: { type: "function", function: { name: "report_defect" } },
    }),
  });
  if (!res.ok) return json({ error: `AI error ${res.status}: ${await res.text()}` }, 500);
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return json({ error: "No structured response" }, 500);
  return json(JSON.parse(tc.function.arguments));
}
