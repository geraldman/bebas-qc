import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL_SCHEMA = {
  name: "report_rca",
  description: "Return structured root cause analysis",
  parameters: {
    type: "object",
    properties: {
      primary_cause: { type: "string" },
      contributing_factors: { type: "array", items: { type: "string" } },
      category: { type: "string", enum: ["machine", "process", "material", "human", "environment"] },
      five_whys: { type: "array", items: { type: "string" } },
      recommendations: { type: "array", items: { type: "string" } },
      urgency: { type: "string", enum: ["low", "medium", "high", "immediate"] },
    },
    required: ["primary_cause", "contributing_factors", "category", "five_whys", "recommendations", "urgency"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { defect, sensorSnapshot, productType } = await req.json();
    const systemPrompt = `You are a senior manufacturing engineer doing 5-Why RCA for ${productType || "packaging/bottle"} production.
Sensors: temp_dht=ambient °C, humidity=%, temp_ds=machine surface °C, distance=ultrasonic cm, vibration=accel m/s².
Be concise, technical, actionable. Return strict JSON matching the schema.`;

    const userPrompt = `Defect: ${defect.defect_type} (${defect.severity}, ${(defect.confidence*100).toFixed(0)}%)
Description: ${defect.description}
Affected area: ${defect.affected_area}
Sensors: ${JSON.stringify(sensorSnapshot)}`;

    const GEMINI = Deno.env.get("GEMINI_API_KEY");
    const OPENAI = Deno.env.get("OPENAI_API_KEY");
    const DEEPSEEK = Deno.env.get("DEEPSEEK_API_KEY");
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");

    if (GEMINI) return await callGemini(GEMINI, systemPrompt, userPrompt);
    if (OPENAI) return await callOpenAICompat("https://api.openai.com/v1/chat/completions", OPENAI, "gpt-4o-mini", systemPrompt, userPrompt);
    if (DEEPSEEK) return await callOpenAICompat("https://api.deepseek.com/v1/chat/completions", DEEPSEEK, "deepseek-chat", systemPrompt, userPrompt);
    if (LOVABLE) return await callOpenAICompat("https://ai.gateway.lovable.dev/v1/chat/completions", LOVABLE, "google/gemini-2.5-flash", systemPrompt, userPrompt);
    return json({ error: "No AI key configured. Set GEMINI_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY in edge function secrets." }, 500);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function callGemini(key: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{ functionDeclarations: [TOOL_SCHEMA] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["report_rca"] } },
      }),
    },
  );
  if (!res.ok) return json({ error: `Gemini error: ${await res.text()}` }, 500);
  const data = await res.json();
  const fc = data.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
  if (!fc) return json({ error: "No structured response from Gemini" }, 500);
  return json(fc.args);
}

async function callOpenAICompat(url: string, key: string, model: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: TOOL_SCHEMA }],
      tool_choice: { type: "function", function: { name: "report_rca" } },
    }),
  });
  if (!res.ok) return json({ error: `AI error ${res.status}: ${await res.text()}` }, 500);
  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return json({ error: "No structured response" }, 500);
  return json(JSON.parse(tc.function.arguments));
}
