import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROMPT = `You extract physical activity data from a user's message and/or image (e.g. a fitness tracker / smartwatch / step counter screenshot, gym machine display, or a text like "walked 6000 steps", "30 min run", "aaj 5km chala").
Return ONLY JSON: {"found": boolean, "activity": string, "steps": integer, "calories_burned": integer}.
- found=false if the user did NOT report an activity they actually did (questions, food photos, plans, symptoms => false).
- If calories burned are not stated, estimate them reasonably from the activity/steps (~0.04 kcal per step). If steps are not stated and not a walking/running activity, use 0.
- activity: short English label like "Walking", "Running 5 km", "Gym workout".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "User not authenticated" }, 401);

    const { message, imageBase64 } = await req.json();
    if (typeof message !== "string" || message.length > 2000) return json({ error: "Invalid message" }, 400);
    if (imageBase64 && (typeof imageBase64 !== "string" || imageBase64.length > 6 * 1024 * 1024)) {
      return json({ error: "Invalid image" }, 400);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const content: unknown = imageBase64
      ? [{ type: "text", text: message || "(image only)" }, { type: "image_url", image_url: { url: imageBase64 } }]
      : message;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: PROMPT }, { role: "user", content }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("extract-activity AI error", resp.status, t);
      return json({ error: `AI error ${resp.status}` }, resp.status);
    }
    const data = await resp.json();
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = String(raw).replace(/```json|```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { return json({ logged: null }); }
    if (!parsed.found) return json({ logged: null });

    const steps = Math.max(0, Math.min(200000, Math.round(Number(parsed.steps) || 0)));
    const calories = Math.max(0, Math.min(20000, Math.round(Number(parsed.calories_burned) || 0)));
    if (!steps && !calories) return json({ logged: null });

    const { data: row, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: user.id,
        activity: String(parsed.activity || "Activity").slice(0, 100),
        steps,
        calories_burned: calories,
        source: imageBase64 ? "photo" : "text",
      })
      .select()
      .single();
    if (error) {
      console.error("insert error", error);
      return json({ error: error.message }, 500);
    }
    return json({ logged: row });
  } catch (e) {
    console.error("extract-activity error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
