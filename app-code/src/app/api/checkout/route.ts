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

const PACKS: Record<string, { coins: number; amount: number; label: string }> = {
  "5":   { coins: 5,   amount: 399,  label: "5 TRADE Coins" },
  "20":  { coins: 20,  amount: 999,  label: "20 TRADE Coins" },
  "100": { coins: 100, amount: 4499, label: "100 TRADE Coins" },
};

export async function POST(req: NextRequest) {
  try {
    const { pack } = await req.json();
    const packData = PACKS[String(pack)];
    if (!packData) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    // Verify user identity via the Supabase JWT sent from the client
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Derive base URL from request (works on localhost and Vercel)
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: packData.label,
              description: `Top up your TRADE wallet with ${packData.coins} coins`,
            },
            unit_amount: packData.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/wallet?success=${packData.coins}`,
      cancel_url: `${origin}/wallet?cancelled=1`,
      metadata: {
        user_id: user.id,
        coins: String(packData.coins),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
