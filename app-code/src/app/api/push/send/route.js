// POST /api/push/send
// Envoie une push notification à un utilisateur (appelé en interne par les autres API routes)
// Body: { userId, title, body, url }

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  "mailto:noreply@tradebe.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const { userId, title, body, url = "/" } = await request.json();
    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

    // Récupère toutes les subscriptions de cet user
    const { data: rows, error } = await supabase
      .from("push_subscriptions")
      .select("subscription, endpoint")
      .eq("user_id", userId);

    if (error) {
      console.error("[push/send] Supabase error:", error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      // Pas de subscription enregistrée — pas d'erreur, juste silencieux
      return Response.json({ ok: true, sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url, icon: "/icon-192.png", badge: "/icon-192.png" });

    const results = await Promise.allSettled(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch (err) {
          // Subscription expirée ou invalide → supprimer de la base
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return Response.json({ ok: true, sent });
  } catch (err) {
    console.error("[push/send] Error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
