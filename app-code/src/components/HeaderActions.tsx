"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* Cluster haut-droit standard du header — données réelles, identiques partout :
   - pill coins  (solde réel)  → /wallet
   - cloche (nb réel de notifs) → /notifications  */
export function HeaderActions() {
  const router = useRouter();
  const [coins, setCoins] = useState<number | null>(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Solde réel
      try {
        const { data: prof } = await supabase.from("profiles").select("coins_balance").eq("id", user.id).single();
        if (!cancelled && typeof prof?.coins_balance === "number") setCoins(prof.coins_balance);
      } catch { /* profiles optional */ }

      // Nombre réel de notifs = matches + likes reçus
      let count = 0;
      try {
        const { count: mc } = await supabase.from("matches")
          .select("*", { count: "exact", head: true })
          .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`);
        count += mc ?? 0;
      } catch { /* matches optional */ }
      try {
        const { count: lc } = await supabase.from("likes")
          .select("*, clothing!inner(user_id)", { count: "exact", head: true })
          .eq("clothing.user_id", user.id);
        count += lc ?? 0;
      } catch { /* likes optional */ }
      if (!cancelled) setNotifCount(count);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      {/* Coins → wallet */}
      <button
        onClick={() => router.push("/wallet")}
        style={{ background: "#F9F4E8", borderRadius: 24, border: "none", padding: "4px 10px 4px 5px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
        aria-label="Wallet"
      >
        <span style={{ position: "relative", display: "inline-block", width: 20, height: 20 }}>
          <Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3c2f22" }}>{coins ?? 0}</span>
      </button>

      {/* Cloche → notifications */}
      <button
        onClick={() => router.push("/notifications")}
        style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: 2, display: "inline-flex" }}
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6 10a6 6 0 0112 0c0 4 2 6 2 6H4s2-2 2-6z" stroke="#ffc543" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 20a2 2 0 004 0" stroke="#ffc543" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {notifCount > 0 && (
          <span style={{ position: "absolute", top: -2, right: -2, minWidth: 15, height: 15, borderRadius: 8, background: "#e03c3c", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
            {notifCount}
          </span>
        )}
      </button>
    </div>
  );
}
