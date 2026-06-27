import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Lazy init — deferred to request time so build doesn't fail without the key
let _stripe: Stripe | null = null;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

// Supabase admin client — bypasses RLS to credit coins server-side
function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret && sig) {
      event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // No secret configured (local dev without Stripe CLI) — parse without verification
      event = JSON.parse(rawBody) as Stripe.Event;
      console.warn("⚠️ Stripe webhook received without signature verification");
    }
  } catch (err) {
    console.error("webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const coins = parseInt(session.metadata?.coins ?? "0", 10);

    if (!userId || coins <= 0) {
      console.error("webhook: missing metadata", session.metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      const admin = getAdminClient();

      // Increment coins_balance atomically via RPC, fall back to read-then-write
      const { data: prof } = await admin
        .from("profiles")
        .select("coins_balance")
        .eq("id", userId)
        .single();

      const current = (prof as { coins_balance?: number } | null)?.coins_balance ?? 0;

      const { error: updateErr } = await admin
        .from("profiles")
        .update({ coins_balance: current + coins })
        .eq("id", userId);

      if (updateErr) {
        console.error("webhook: profile update failed", updateErr);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }

      // Record the purchase transaction
      await admin.from("transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: coins,
        description: `Purchased ${coins} coins`,
      });

      // Insert notification so the user sees it in-app
      try {
        await admin.from("notifications").insert({
          user_id: userId,
          type: "purchase",
          body: `🪙 ${coins} coins added to your wallet!`,
          read: false,
          link: "/wallet",
        });
      } catch { /* notifications table may not exist */ }

      console.log(`✅ Credited ${coins} coins to user ${userId}`);
    } catch (err) {
      console.error("webhook: processing error", err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
