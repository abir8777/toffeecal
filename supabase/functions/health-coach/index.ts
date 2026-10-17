import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const gatewayFallback = (mode: string | undefined) => {
  const isCoach = mode === "coach";
  return isCoach
    ? "I'm having a brief AI service hiccup, but I'm still here. Keep your next step simple: hydrate, choose a protein-rich meal, and log what you eat so we can stay on track."
    : "I'm having a brief AI service hiccup right now. If this is urgent or worsening, please seek medical care immediately; otherwise, try again in a moment and consult a qualified clinician for personal medical advice.";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let requestMode: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "User not authenticated" }, 401);
    }

    const body = await req.json();
    const { message, imageBase64, mode } = body;
    requestMode = mode;
    const isCoach = mode === "coach";
    let { conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return jsonResponse({ error: "Message is required" }, 400);
    }
    if (message.length > 2000) {
      return jsonResponse({ error: "Message too long (max 2000 characters)" }, 400);
    }

    // Cap image payload size (~4 MB base64) to prevent resource exhaustion / cost abuse.
    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.length > 6 * 1024 * 1024) {
      return jsonResponse({ error: "Image too large (max ~3 MB)" }, 400);
    }

    if (conversationHistory && !Array.isArray(conversationHistory)) {
      conversationHistory = [];
    }
    // Keep only the most recent turns to reduce tokens & latency
    if (conversationHistory && conversationHistory.length > 6) {
      conversationHistory = conversationHistory.slice(-6);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return jsonResponse({ error: "AI is not configured on the server" }, 500);
    }

    // Fetch minimal user context in parallel (skip food logs & water for speed)
    const today = new Date().toISOString().split("T")[0];
    const [profileRes, waterRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("name, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target, daily_water_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", today),
    ]);
    const profile = profileRes.data;
    const totalWater = waterRes.data?.reduce((sum: number, w: any) => sum + w.amount_ml, 0) || 0;

    const userContext = profile
      ? `User: ${profile.name || "?"}, ${profile.age || "?"}y ${profile.gender || ""}, ${profile.height_cm || "?"}cm ${profile.weight_kg || "?"}kg, ${profile.activity_level || "?"} activity, goal: ${profile.goal?.replace("_", " ") || "?"}, calorie target: ${profile.daily_calorie_target || "?"}kcal, water today: ${totalWater}/${profile.daily_water_goal_ml || 2500}ml.`
      : "";

    const langRule = `LANGUAGE: Detect the user's language and script, including Romanized Hindi/Hinglish or Bengali-English (e.g. "Mare sare finger me asya Hua ha"). Reply in the same language and script the user wrote in, using simple clear words; if unsure, reply in clear simple English. Always directly address the specific issue described.`;

    const coachPrompt = `You are "Coach", an encouraging, certified fitness and nutrition coach. When a user uploads food, physique photos, or exercise questions, analyze the visual input (e.g., estimate meal ingredients, portion sizes, calories and macronutrients, or posture) and provide actionable, motivating guidance tailored to their health, diet, and training goals. Keep it concise (short paragraphs or bullets). Knowledgeable on Indian cuisine. Never diagnose medical conditions; refer medical issues to a doctor. ${langRule} ${userContext}`;

    const doctorPrompt = `You are "Doc", an empathetic, knowledgeable health assistant. When a user provides symptoms and/or images (like skin issues, rashes, or injuries), analyze the image carefully. Describe what visible characteristics you observe, list potential general causes, suggest safe initial home care / soothing practices, and ask relevant follow-up questions (duration, pain level, spread). Never state a diagnosis with certainty or prescribe medication. For emergencies (chest pain, breathing trouble, severe injury, heavy bleeding) urge immediate medical care. Always end with a clear medical disclaimer that you are an AI assistant and the user should consult a qualified doctor or dermatologist for a formal diagnosis and prescription. ${langRule} ${userContext}`;

    const systemPrompt = isCoach ? coachPrompt : doctorPrompt;

    // Build messages
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const ALLOWED_ROLES = new Set(["user", "assistant"]);
      for (const msg of conversationHistory) {
        if (
          msg &&
          ALLOWED_ROLES.has(msg.role) &&
          typeof msg.content === "string" &&
          msg.content.length > 0 &&
          msg.content.length <= 2000
        ) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Build user message content (text + optional image)
    if (imageBase64 && typeof imageBase64 === "string") {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message },
          {
            type: "image_url",
            image_url: { url: imageBase64 },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    const fallbackReply = gatewayFallback(mode);

    const callAi = (model: string) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
      });

    // Try the preferred fast model first, then a lighter backup for text requests.
    // Both models support vision (image + text input).
    const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash"];

    let response: Response | null = null;
    let lastError: { status: number; body: string } | null = null;
    for (const model of models) {
      try {
        response = await callAi(model);
      } catch (error) {
        console.error("AI gateway fetch failed", { model, error });
        continue;
      }

      if (response.ok && response.body) break;

      const status = response.status;
      const errText = await response.text().catch(() => "");
      console.error("AI gateway model error", { model, status, body: errText });

      if (status === 429 || status === 402 || status === 403 || status < 500) {
        lastError = { status, body: errText };
        break;
      }
      lastError = { status, body: errText };
    }

    if (!response || !response.ok || !response.body) {
      const status = response?.status || 503;
      if (status === 429) {
        return jsonResponse({ error: "Too many requests right now. Please try again in a moment! 😊" }, 429);
      }
      if (status === 402) {
        return jsonResponse({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      }

      let detail = "";
      try { detail = JSON.parse(lastError?.body || "{}")?.error?.message || ""; } catch { detail = (lastError?.body || "").slice(0, 300); }
      return jsonResponse({ error: `AI service error${detail ? `: ${detail}` : ""}`, status }, status >= 400 ? status : 502);
    }

    // Stream SSE directly back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("health-coach error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: `Server error: ${msg}` }, 500);
  }
});
