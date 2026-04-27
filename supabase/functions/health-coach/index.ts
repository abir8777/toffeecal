import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { message, imageBase64, mode } = body;
    const isCoach = mode === "coach";
    let { conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 2000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      throw new Error("Service configuration error");
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

    const coachPrompt = `You are "Coach", a friendly health & fitness coach. Give concise, actionable, encouraging advice (2-3 short paragraphs max). Knowledgeable on Indian cuisine. Never diagnose or prescribe; for medical issues recommend a doctor. ${userContext}`;

    const doctorPrompt = `You are "Doc", an AI health assistant. Be evidence-based, calm, concise. Use hedging ("could be", "may indicate"). Never diagnose with certainty or prescribe meds. For emergencies (chest pain, breathing issues, severe injury) urge immediate care. For images: brief observation → 2-3 possible causes → what to do now → when to see a doctor. Always remind to consult a professional. ${userContext}`;

    const systemPrompt = isCoach ? coachPrompt : doctorPrompt;

    // Build messages
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role && msg.content) {
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

    const fallbackReply = isCoach
      ? "I'm having a brief AI service hiccup, but I'm still here. Keep your next step simple: hydrate, choose a protein-rich meal, and log what you eat so we can stay on track."
      : "I'm having a brief AI service hiccup right now. If this is urgent or worsening, please seek medical care immediately; otherwise, try again in a moment and consult a qualified clinician for personal medical advice.";

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
    const models = imageBase64
      ? ["google/gemini-2.5-flash"]
      : ["google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"];

    let response = await callAi(models[0]);
    if (!response.ok && response.status >= 500 && models[1]) {
      const errText = await response.text().catch(() => "");
      console.error("AI gateway primary model error", { status: response.status, body: errText });
      response = await callAi(models[1]);
    }

    if (!response.ok || !response.body) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests right now. Please try again in a moment! 😊" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text().catch(() => "");
      console.error("AI gateway error", { status: response.status, body: errText });

      if (response.status >= 500) {
        return new Response(
          JSON.stringify({ message: fallbackReply, fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI service unavailable (${response.status}). Please try again.` }),
        { status: response.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream SSE directly back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("health-coach error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred with the AI Doctor. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
