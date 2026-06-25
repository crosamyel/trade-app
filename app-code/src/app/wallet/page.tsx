"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Tx = {
  id: string | number;
  type?: string;       // received / spent / pending / trade_in / trade_out / escrow_hold ...
  amount?: number;
  description?: string;
  created_at?: string;
};

const PACKS = [
  { coins: 5, price: "3,99€" },
  { coins: 20, price: "9,99€", popular: true },
  { coins: 100, price: "44,99€" },
];

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [reserved, setReserved] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Solde coins réel depuis Supabase
      const { data: prof, error: profErr } = await supabase
        .from("profiles").select("coins_balance, reserved_coins").eq("id", user.id).single();
      if (profErr) console.error("wallet/profiles:", profErr.message);
      if (typeof prof?.coins_balance === "number") setBalance(prof.coins_balance);
      else setBalance(0);
      if (typeof prof?.reserved_coins === "number") setReserved(prof.reserved_coins);

      // Vraies transactions
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setTxs((transactions as Tx[]) ?? []);
    }
    init();
  }, [router]);

  const safeBalance = balance ?? 0;
  const available = safeBalance - reserved;

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header unifié */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingBottom: 14,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>

      <div style={{ padding: "20px 18px 120px" }}>
        {/* Titre centré italic */}
        <h1 style={{ margin: "0 0 18px", textAlign: "center", fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>My wallet</h1>

        {/* Carte coins principale — gris brun foncé, plus haute, couronne en haut à gauche */}
        <div style={{ position: "relative", background: "#3d342c", borderRadius: 24, padding: "44px 28px 32px", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {/* Couronne dessinée en haut à droite, bien grande */}
          <div style={{ position: "absolute", top: -88, right: -16, width: 132, height: 132, transform: "scaleX(-1) rotate(-22deg)", pointerEvents: "none", zIndex: 2 }}>
            <Image src="/crown.png" alt="" fill style={{ objectFit: "contain" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 70, fontWeight: 800, fontStyle: "italic", color: "#FFC543", lineHeight: 1 }}>
              {balance === null ? "—" : safeBalance}
            </span>
            <div style={{ position: "relative", width: 46, height: 46 }}><Image src="/coin.png" alt="coin" fill style={{ objectFit: "contain" }} /></div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "28px 0 18px" }} />
          <div style={{ display: "flex" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Available</div>
              <div style={{ color: "#FFC543", fontSize: 20, fontWeight: 800, marginTop: 3 }}>
                {balance === null ? "—" : available}
              </div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.15)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Reserved</div>
              <div style={{ color: "#FFC543", fontSize: 20, fontWeight: 800, marginTop: 3 }}>{reserved}</div>
            </div>
          </div>
        </div>

        {/* Buy coins */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#2D1A0A", margin: "26px 0 12px" }}>Buy coins</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {PACKS.map((p) => (
            <button key={p.coins} onClick={() => { setToast("Coming soon — payments will be available shortly 🪙"); setTimeout(() => setToast(""), 2800); }} style={{ position: "relative", flex: 1, borderRadius: 16, border: "1.5px solid #E8E4DC", background: p.popular ? "#FFF8E7" : "#F9F4E8", padding: "18px 6px 14px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", cursor: "pointer" }}>
              {p.popular && (
                <span style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 10, fontWeight: 700, color: "#8a6d2a", background: "#FFE9A8", borderRadius: 12, padding: "2px 8px" }}>⭐ Most popular</span>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 800, fontStyle: "italic", color: "#FFC543" }}>{p.coins}</span>
                <span style={{ position: "relative", display: "inline-block", width: 16, height: 16 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
              </div>
              <div style={{ fontSize: 13, color: "#D97A3A", marginTop: 6, fontWeight: 600 }}>{p.price}</div>
            </button>
          ))}
        </div>

        {/* Recent transactions */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#2D1A0A", margin: "26px 0 12px" }}>Recent transactions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {txs.map((t) => <TxRow key={String(t.id)} tx={t} />)}
          {txs.length === 0 && (
            <p style={{ color: "#2D1A0A", opacity: 0.55, fontSize: 14, textAlign: "center", padding: "16px 0", lineHeight: 1.5 }}>
              No transactions yet.<br />They&apos;ll appear after your trades.
            </p>
          )}
        </div>
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#2D1A0A", color: "#FFC543", fontWeight: 700, fontSize: 14, padding: "12px 20px", borderRadius: 24, zIndex: 95, whiteSpace: "nowrap", boxShadow: "0 4px 18px rgba(0,0,0,0.3)", maxWidth: "calc(100% - 40px)", textAlign: "center" }}>{toast}</div>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: Tx }) {
  const pending = (tx.type ?? "").includes("pending") || (tx.type ?? "").includes("escrow");
  const positive = !pending && (tx.amount ?? 0) >= 0;
  const bg = pending ? "#F9F4E8" : positive ? "#D4EDDA" : "#F8D7DA";
  const amtColor = pending ? "#2D1A0A" : positive ? "#2e7d32" : "#c0392b";
  const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-GB") : "";
  const amt = tx.amount ?? 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(45,26,10,0.5)", marginBottom: 5, paddingLeft: 4 }}>{date}</div>
      <div style={{ background: bg, borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2D1A0A" }}>{tx.description ?? "Transaction"}</span>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 800, color: amtColor, whiteSpace: "nowrap" }}>
          {pending && <span style={{ opacity: 0.6 }}>⏳</span>}
          {!pending && (amt >= 0 ? `+${amt}` : `${amt}`)}
          {pending && `+${Math.abs(amt)}`}
          <span style={{ position: "relative", display: "inline-block", width: 15, height: 15 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
        </span>
      </div>
    </div>
  );
}
