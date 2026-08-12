import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // ---- AUTH GATE: service-role callers, or an admin JWT. Nothing else. ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (token !== serviceKey) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      const uid = userData?.user?.id;
      if (userErr || !uid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Get the private key from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "vapid_private_key")
      .single();

    if (!setting?.setting_value) {
      throw new Error("VAPID private key not found in system_settings");
    }

    webpush.setVapidDetails(
      "mailto:admin@kaiferdata.com",
      "BETfQPCOgVhgF9JpNx388hViZeAPp2VX8scW-Gt616PZGpyhDQr9PTtg8fKzUIagJyeiW8k-sI3pX-dW-shLe9c", // Public key from earlier
      setting.setting_value
    );

    const body = await req.json().catch(() => ({}));
    const asText = (v: unknown, fallback: string, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

    const payload = JSON.stringify({
      title: asText(body?.title, "KaiferData Alert", 100),
      body: asText(body?.body, "A new alert requires your attention.", 300),
      data: body?.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {}
    });

    // Get all admin subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth_key,
          p256dh: sub.p256dh_key
        }
      };
      
      return webpush.sendNotification(pushSubscription, payload).catch(async (error) => {
        console.error("Error sending push to", sub.endpoint, error);
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      });
    });

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, sent: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-admin-push error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
