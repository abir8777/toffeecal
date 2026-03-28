import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://toffeecal.lovable.app",
  "https://id-preview--53cdf1c6-b899-4dfb-83ea-5b11c1ba35e8.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate first
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

    // Now validate inputs
    const body = await req.json();
    const { message } = body;
    let { conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required and must be a string" }),
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
      return new Response(
        JSON.stringify({ error: "Invalid conversation history format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (conversationHistory && conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        if (!msg.role || !msg.content || typeof msg.content !== "string") {
          return new Response(
            JSON.stringify({ error: "Invalid message format in conversation history" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("Service configuration error");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get recent food logs for context
    const { data: recentFoodLogs } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(10);

    // Get today's water intake
    const today = new Date().toISOString().split("T")[0];
    const { data: waterIntake } = await supabase
      .from("water_intake")
      .select("amount_ml")
      .eq("user_id", user.id)
      .gte("logged_at", today);

    const totalWater = waterIntake?.reduce((sum, w) => sum + w.amount_ml, 0) || 0;

    // Build user context
    const userContext = profile ? `
User Profile:
- Name: ${profile.name || "Not set"}
- Age: ${profile.age || "Not set"}
- Gender: ${profile.gender || "Not set"}
- Height: ${profile.height_cm ? `${profile.height_cm} cm` : "Not set"}
- Current Weight: ${profile.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
- Activity Level: ${profile.activity_level || "Not set"}
- Goal: ${profile.goal?.replace("_", " ") || "Not set"}
- Daily Calorie Target: ${profile.daily_calorie_target || "Not set"} kcal
- Daily Water Goal: ${profile.daily_water_goal_ml || 2500} ml
- Today's Water Intake: ${totalWater} ml

Recent Food Logs (last 10 meals):
${recentFoodLogs?.map(log => `- ${log.food_name}: ${log.calories} kcal (${log.meal_type})`).join("\n") || "No recent logs"}
` : "User profile not available.";

    const systemPrompt = `You are a friendly, professional health coach AI assistant named "Coach". You provide personalized nutrition, fitness, and wellness advice.

IMPORTANT GUIDELINES:
1. Be encouraging, supportive, and non-judgmental.
2. Provide practical, actionable advice tailored to the user's goals.
3. Consider the user's profile, recent meals, and water intake when giving advice.
4. Focus on sustainable, healthy habits rather than extreme measures.
5. Never provide medical diagnoses or prescribe medications.
6. If asked about medical conditions, recommend consulting a healthcare professional.
7. Keep responses concise but helpful (2-3 paragraphs max).
8. Use emojis sparingly to keep the tone friendly.
9. Be knowledgeable about Indian foods and cuisines.
10. Celebrate small wins and progress.

${userContext}

Remember: You're a supportive coach, not a doctor. Focus on general wellness, nutrition tips, motivation, and healthy lifestyle advice.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add the new user message
    messages.push({ role: "user", content: message });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "I'm getting too many requests right now. Please try again in a moment! 😊" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error", { status: response.status });
      throw new Error("Failed to get response from health coach");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("No response from health coach");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("health-coach error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred with the health coach. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
