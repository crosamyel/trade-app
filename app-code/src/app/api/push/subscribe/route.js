// POST /api/push/subscribe
// Sauvegarde la subscription push d'un utilisateur

import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  try {
    const { subscription, userId } = await request.json();
    if (!subscription || !userId) {
      return Response.json({ error: "Missing subscription or userId" }, { status: 400 });
    }

    // Upsert : une subscription par endpoint (endpoint = identifiant unique du browser)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, subscription, endpoint: subscription.endpoint, updated_at: new Date().toISOString() },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push/subscribe] Supabase error:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
