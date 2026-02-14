import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const today = new Date().toISOString().split("T")[0];

    // Get today's food logs
    const { data: todayLogs } = await supabase
      .from("food_logs")
      .select("calories, protein_g, carbs_g, fat_g, food_name, meal_type")
      .eq("user_id", user.id)
      .gte("logged_at", today);

    const totalCalories = todayLogs?.reduce((s, l) => s + l.calories, 0) || 0;
    const totalProtein = todayLogs?.reduce((s, l) => s + (l.protein_g || 0), 0) || 0;
    const mealsLogged = todayLogs?.length || 0;

    // Get today's water
    const { data: waterLogs } = await supabase
      .from("water_intake")
      .select("amount_ml")
      .eq("user_id", user.id)
      .gte("logged_at", today);

    const totalWater = waterLogs?.reduce((s, w) => s + w.amount_ml, 0) || 0;

    // Get recent weight trend
    const { data: weightLogs } = await supabase
      .from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(5);

    const weightTrend = weightLogs && weightLogs.length >= 2
      ? weightLogs[0].weight_kg - weightLogs[weightLogs.length - 1].weight_kg
      : null;

    const context = `
User: ${profile?.name || "User"}, Goal: ${profile?.goal?.replace("_", " ") || "maintain weight"}
Calorie target: ${profile?.daily_calorie_target || 2000} kcal
Today so far: ${totalCalories} kcal consumed, ${mealsLogged} meals logged, ${totalProtein}g protein, ${totalWater}ml water (goal: ${profile?.daily_water_goal_ml || 2500}ml)
Weight trend (recent): ${weightTrend !== null ? `${weightTrend > 0 ? "gained" : "lost"} ${Math.abs(weightTrend).toFixed(1)}kg` : "no data"}
Current time: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a motivational health coach. Generate ONE short, personalized daily tip (2-3 sentences max) based on the user's progress. Be encouraging, specific, and actionable. Use one emoji at the start. Don't use markdown. Consider time of day for relevance.`,
          },
          { role: "user", content: context },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      throw new Error("Failed to generate tip");
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content;

    if (!tip) throw new Error("No tip generated");

    console.log("Daily tip generated for user:", user.id);

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("daily-tip error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while generating your daily tip. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
