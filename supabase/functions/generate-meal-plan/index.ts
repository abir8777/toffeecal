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
  const corsHeaders = getCorsHeaders(req);
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
    const { cuisinePreference } = body;

    if (!cuisinePreference || typeof cuisinePreference !== "string") {
      return new Response(
        JSON.stringify({ error: "Cuisine preference is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Service configuration error");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const calorieTarget = profile?.daily_calorie_target || 2000;
    const goal = profile?.goal?.replace("_", " ") || "maintain weight";

    // Calculate macro targets
    const macroRatios: Record<string, { protein: number; carbs: number; fat: number }> = {
      "lose weight": { protein: 0.35, carbs: 0.35, fat: 0.30 },
      "maintain": { protein: 0.30, carbs: 0.45, fat: 0.25 },
      "gain muscle": { protein: 0.35, carbs: 0.45, fat: 0.20 },
    };
    const ratio = macroRatios[goal] || macroRatios["maintain"];
    const proteinTarget = Math.round((calorieTarget * ratio.protein) / 4);
    const carbsTarget = Math.round((calorieTarget * ratio.carbs) / 4);
    const fatTarget = Math.round((calorieTarget * ratio.fat) / 9);

    const prompt = `Generate a 7-day meal plan as a JSON array. The user wants ${cuisinePreference} cuisine.

User profile:
- Daily calorie target: ${calorieTarget} kcal
- Goal: ${goal}
- Protein target: ~${proteinTarget}g/day
- Carbs target: ~${carbsTarget}g/day
- Fat target: ~${fatTarget}g/day

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
[
  {
    "day": "Monday",
    "meals": [
      { "type": "breakfast", "name": "Meal name", "calories": 400, "protein_g": 20, "carbs_g": 50, "fat_g": 15, "description": "Brief description" },
      { "type": "lunch", "name": "...", "calories": 600, "protein_g": 30, "carbs_g": 60, "fat_g": 20, "description": "..." },
      { "type": "dinner", "name": "...", "calories": 500, "protein_g": 25, "carbs_g": 55, "fat_g": 18, "description": "..." },
      { "type": "snack", "name": "...", "calories": 200, "protein_g": 10, "carbs_g": 20, "fat_g": 8, "description": "..." }
    ]
  }
]

Rules:
- Each day must have exactly 4 meals (breakfast, lunch, dinner, snack)
- Daily totals should approximate the calorie and macro targets
- Use realistic, specific ${cuisinePreference} dishes
- Keep descriptions to 1 sentence
- Return 7 days (Monday through Sunday)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional nutritionist. Return only valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI gateway error:", response.status, errBody);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Clean potential markdown wrapping
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const mealPlan = JSON.parse(content);

    return new Response(JSON.stringify({ mealPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-meal-plan error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate meal plan. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
