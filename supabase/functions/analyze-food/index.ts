import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    let messages: any[] = [
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
      throw new Error("No food input provided");
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze food");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default response if parsing fails
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
