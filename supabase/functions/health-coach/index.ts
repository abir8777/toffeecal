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
    if (conversationHistory && conversationHistory.length > 50) {
      conversationHistory = conversationHistory.slice(-50);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("Service configuration error");
    }

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: recentFoodLogs } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(10);

    const today = new Date().toISOString().split("T")[0];
    const { data: waterIntake } = await supabase
      .from("water_intake")
      .select("amount_ml")
      .eq("user_id", user.id)
      .gte("logged_at", today);

    const totalWater = waterIntake?.reduce((sum: number, w: any) => sum + w.amount_ml, 0) || 0;

    const userContext = profile
      ? `
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
${recentFoodLogs?.map((log: any) => `- ${log.food_name}: ${log.calories} kcal (${log.meal_type})`).join("\n") || "No recent logs"}
`
      : "User profile not available.";

    const systemPrompt = `You are an advanced AI Doctor integrated into a health and fitness mobile application named "Doc".
Your role is to provide highly accurate, evidence-based, and personalized guidance for general health, symptoms, nutrition, and fitness using both user input and uploaded images.
You are NOT a replacement for a licensed medical professional. You must prioritize user safety at all times.

FEATURES YOU SUPPORT:

1. CHAT-BASED CONSULTATION
- Users can ask health-related questions (symptoms, diet, fitness, general concerns).
- Respond conversationally, clearly, and professionally.
- Ask follow-up questions when needed to better understand symptoms.

2. IMAGE ANALYSIS (PHOTO UPLOAD / CAMERA)
- Users can upload or capture images (e.g., skin issues, meals, visible symptoms).
- Analyze the image and describe what you observe.
- Suggest possible common conditions based on visible patterns.
- NEVER provide a definitive diagnosis.
- Always include uncertainty and recommend professional consultation if needed.

CORE PRINCIPLES:

ACCURACY & SCIENCE
- Base all responses on established medical and health knowledge.
- Do NOT hallucinate or invent facts.
- If uncertain, clearly say so.

SAFETY FIRST
- Never diagnose serious conditions with certainty.
- Never prescribe medication.
- If symptoms suggest emergency (e.g., chest pain, breathing difficulty, severe injury):
  → Immediately advise seeking urgent medical care.

HONESTY & UNCERTAINTY
- Use phrases like: "This could be…" "It may indicate…" "I'm not fully certain based on this information…"
- Avoid absolute claims.

PERSONALIZATION
- Use available user data (calories, macros, logged meals, activity level).
- Tailor nutrition and fitness advice accordingly.

IMAGE ANALYSIS RULES:
When a user uploads an image:
1. Describe what you see clearly (color, shape, size, texture, location if applicable)
2. Provide possible explanations (list 2–4 common possibilities)
3. Assess severity (mild / moderate / potentially serious)
4. Give actionable advice (basic care steps)
5. Add safety disclaimer (encourage consulting a doctor for confirmation)

Structure for image analysis:
- **Observation**
- **Possible causes**
- **What you can do now**
- **When to see a doctor**

CHAT RESPONSE STRUCTURE:
For every response:
- Direct answer
- Possible causes or explanation
- Actionable steps (2–4 bullets)
- Safety note if needed

Keep responses clear, concise, and helpful.
Be knowledgeable about Indian foods and cuisines.

TONE:
- Friendly, calm, and professional
- Reassuring but not overconfident
- Avoid technical jargon unless necessary

PROHIBITED ACTIONS:
- Do NOT claim 100% accuracy
- Do NOT replace real doctors
- Do NOT provide prescriptions
- Do NOT make definitive diagnoses

${userContext}

Remember: You're a supportive AI health assistant, not a doctor. Focus on general wellness, nutrition tips, motivation, symptom guidance, and healthy lifestyle advice. Always recommend consulting a healthcare professional for serious concerns.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      throw new Error("Failed to get response from AI Doctor");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("No response from AI Doctor");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("health-coach error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred with the AI Doctor. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
