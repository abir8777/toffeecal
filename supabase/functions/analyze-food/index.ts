import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeoutMs = 30000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (res.status === 429 && i < retries) {
        console.warn(`Rate limited, retrying (${i + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error(`Request timed out after ${timeoutMs}ms (attempt ${i + 1})`);
      } else {
        console.error(`Fetch error (attempt ${i + 1}):`, lastError.message);
      }
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError || new Error("All retries failed");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
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
    const { text, image } = body;

    console.info("=== analyze-food request ===");
    console.info("User:", user.id);
    console.info("Has text:", !!text, text ? `(${text.length} chars)` : "");
    console.info("Has image:", !!image, image ? `(${image.length} chars / ~${Math.round(image.length * 0.75 / 1024)}KB)` : "");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Validate image size (max ~4MB base64 ≈ 3MB file)
    if (image && image.length > 4 * 1024 * 1024) {
      console.error("Image too large:", image.length, "chars");
      return new Response(
        JSON.stringify({ error: "Image is too large. Please use an image under 3MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a nutritionist AI assistant specialized in food calorie estimation. You analyze food items and provide accurate nutritional information.

IMPORTANT GUIDELINES:
1. Always provide calorie estimates as a range (min-max) to account for variations in preparation and portion sizes.
2. Be especially knowledgeable about Indian foods including roti, rice, dal, sabzi, biryani, momo, samosa, paratha, dosa, idli, and street food.
3. Estimates are approximate - acknowledge this in suggestions.
4. Provide practical, non-judgmental health tips.
5. Never make medical claims or prescribe diets.

You MUST respond with ONLY valid JSON in this exact format:
{
  "food_name": "Name of the food item(s)",
  "calories": 250,
  "calories_min": 200,
  "calories_max": 300,
  "protein_g": 10,
  "carbs_g": 30,
  "fat_g": 8,
  "suggestions": "A brief, friendly tip about this food or a healthier alternative"
}

Do not include any text before or after the JSON. Only output the JSON object.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (image) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this food image and estimate its nutritional content. If you can identify multiple items, sum them up. Be specific about portion sizes you're estimating.",
          },
          {
            type: "image_url",
            image_url: { url: image },
          },
        ],
      });
    } else if (text) {
      messages.push({
        role: "user",
        content: `Analyze this food and estimate its nutritional content: "${text}". Assume a standard serving size unless specified.`,
      });
    } else {
      return new Response(
        JSON.stringify({ error: "No food input provided. Please enter text or upload an image." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info("Sending request to AI gateway...");

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      },
      2,
      45000
    );

    console.info("AI gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI analysis failed (status ${response.status})`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    console.info("AI response content length:", content?.length || 0);

    if (!content) {
      console.error("No content in AI response:", JSON.stringify(data));
      throw new Error("No response from AI");
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      result = {
        food_name: text || "Unknown food",
        calories: 200,
        calories_min: 150,
        calories_max: 250,
        protein_g: 5,
        carbs_g: 25,
        fat_g: 8,
        suggestions: "Could not fully analyze this food. Consider logging with manual adjustments.",
      };
    }

    console.info("analyze-food success:", result.food_name, result.calories, "cal");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-food error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
