import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://toffeecal.lovable.app",
  "https://id-preview--53cdf1c6-b899-4dfb-83ea-5b11c1ba35e8.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  // Allow listed origins explicitly; fall back to "*" so that mobile WebView
  // (Median app, file://, capacitor://, etc.) where Origin may be missing
  // or non-standard does not get blocked by CORS.
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user with their token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      console.error("getUser failed:", userError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate confirmation
    let body: { confirmText?: string } = {};
    try {
      body = await req.json();
    } catch (_) {
      // ignore
    }
    if (body.confirmText !== "DELETE") {
      return new Response(
        JSON.stringify({ error: "Confirmation required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Use service role client for deletion
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Best-effort: remove avatar files first (they don't cascade).
    // Wrap each step so a single failure surfaces a clear error message
    // instead of being swallowed.
    try {
      const { data: files } = await adminClient.storage.from("avatars").list(userId);
      if (files && files.length > 0) {
        await adminClient.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch (e) {
      console.error("avatar cleanup failed (continuing):", e);
    }

    // All public tables FK to auth.users with ON DELETE CASCADE, so deleting
    // the auth user removes profiles, food_logs, weight_logs, water_intake,
    // and saved_meal_plans automatically. We still attempt explicit cleanup
    // first to be safe against future tables without cascade.
    for (const table of [
      "food_logs",
      "weight_logs",
      "water_intake",
      "saved_meal_plans",
      "profiles",
    ]) {
      const { error: delErr } = await adminClient
        .from(table)
        .delete()
        .eq("user_id", userId);
      if (delErr) {
        console.error(`Failed deleting from ${table}:`, delErr);
      }
    }

    // Delete the auth user — this is the critical step.
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error("auth.admin.deleteUser failed:", authDeleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete user: ${authDeleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info("Account deleted successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("delete-account error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: `Account deletion failed: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
