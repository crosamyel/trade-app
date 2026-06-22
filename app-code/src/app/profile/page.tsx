"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Item = { id: string | number; image_url?: string; title?: string; price_coins?: number; status?: string };

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("My profile");
  const [initial, setInitial] = useState("?");
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<"articles" | "done">("articles");
  const [city, setCity] = useState("Brussels");
  const [bio, setBio] = useState("I would like to trade clothes, what do you got?");
  const [articlesCount, setArticlesCount] = useState(0);
  const [trades, setTrades] = useState(0);
  const [stars, setStars] = useState("—");

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      setInitial((user.email?.[0] ?? "?").toUpperCase());
      setName(user.email?.split("@")[0] ?? "My profile");

      // Profile (username, coins, city, bio) — select * so a missing column won't crash
      try {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("id", user.id).single();
        if (prof?.username) { setName(prof.username); setInitial(prof.username[0].toUpperCase()); }
        if (typeof prof?.coins_balance === "number") setCoins(prof.coins_balance);
        if (prof?.city) setCity(prof.city);
        if (prof?.bio) setBio(prof.bio);
      } catch { /* profiles unavailable */ }

      // My items (real articles)
      const { data: clothes } = await supabase
        .from("clothing").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      setItems((clothes as Item[]) ?? []);

      // Articles count (active items)
      const { count } = await supabase
        .from("clothing").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "active");
      setArticlesCount(count ?? 0);

      // Trades = completed matches involving me
      try {
        const { count: tc } = await supabase
          .from("matches").select("*", { count: "exact", head: true })
          .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`)
          .eq("status", "completed");
        setTrades(tc ?? 0);
      } catch { /* status column may not exist yet */ }

      // Stars = average rating received
      try {
        const { data: r } = await supabase.from("ratings").select("stars").eq("rated_id", user.id);
        if (r && r.length > 0) {
          const avg = r.reduce((s: number, x: { stars: number }) => s + x.stars, 0) / r.length;
          setStars(avg.toFixed(1));
        }
      } catch { /* ratings table may not exist yet */ }
    }
    init();
  }, [router]);

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header unifié */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(112px + env(safe-area-inset-top))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: 14,
      }}>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>

      <div style={{ padding: "8px 18px 120px" }}>
        {/* Avatar + rayons */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 26, marginBottom: 8 }}>
          <div style={{ position: "relative", width: 150, height: 130, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <SunRays />
            <div style={{ position: "relative", width: 100, height: 100, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(255,197,67,0.5)" }}>
              <span style={{ color: "#fff", fontSize: 48, fontWeight: 800 }}>{initial}</span>
              {/* Camera */}
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: "#2D1A0A", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #F9F4E8" }}>
                <CameraMini />
              </div>
            </div>
          </div>
        </div>

        {/* Nom */}
        <h1 style={{ textAlign: "center", margin: "0 0 10px", fontSize: 22, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>{name}</h1>

        {/* Info */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 18, padding: "0 6px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#2D1A0A", opacity: 0.7, lineHeight: 1.4, maxWidth: 150 }}>{city}, member since 2025</p>
          <div style={{ width: 1, background: "rgba(45,26,10,0.2)" }} />
          <p style={{ margin: 0, fontSize: 13, color: "#2D1A0A", opacity: 0.7, lineHeight: 1.4, maxWidth: 150, fontStyle: "italic" }}>&quot;{bio}&quot;</p>
        </div>

        {/* Edit profile — outline style */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <button
            onClick={() => router.push("/profile/edit")}
            style={{ width: "min(250px, 100%)", height: 52, background: "transparent", border: "2px solid #FFC543", borderRadius: 26, color: "#2D1A0A", fontWeight: 800, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          >
            Edit my profile
            <BigArrow color="#2D1A0A" />
          </button>
        </div>

        {/* Stats — 4 bulles */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <StatBubble value={String(trades)} label="Trades" />
          <StatBubble value={String(articlesCount)} label="Articles" />
          <StatBubble value={stars} label="Stars" big />
          <StatBubble value={String(coins)} label="Coins" />
        </div>

        {/* See wallet — filled style */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <button
            onClick={() => router.push("/wallet")}
            style={{ width: "min(250px, 100%)", height: 52, background: "#2D1A0A", border: "none", borderRadius: 26, color: "#FFC543", fontWeight: 800, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <WalletIcon /> See wallet
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid rgba(45,26,10,0.12)", marginBottom: 14 }}>
          <Tab label="My articles" active={tab === "articles"} onClick={() => setTab("articles")} />
          <Tab label="Trades done" active={tab === "done"} onClick={() => setTab("done")} />
        </div>

        {/* Grid */}
        {tab === "articles" ? (
          items.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {items.map((it) => <ItemCard key={String(it.id)} item={it} />)}
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ color: "#2D1A0A", opacity: 0.55, fontSize: 14, marginBottom: 14 }}>You don&apos;t have any articles yet.</p>
              <button onClick={() => router.push("/upload")} style={{ height: 46, padding: "0 22px", borderRadius: 23, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>+ Add an item</button>
            </div>
          )
        ) : (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 30, fontSize: 14 }}>No completed trades yet.</p>
        )}
      </div>
    </div>
  );
}

/* ===== Sous-composants ===== */
function StatBubble({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div style={{
      background: "#F9F4E8", border: "1.5px solid #E8E4DC", borderRadius: 18,
      width: "clamp(60px, 18vw, 78px)", padding: "11px 4px", textAlign: "center", flexShrink: 0,
      transform: big ? "scale(1.08)" : "none",
      boxShadow: big ? "0 4px 14px rgba(0,0,0,0.06)" : "none",
    }}>
      <div style={{ fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 800, fontStyle: "italic", color: "#FFC543", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "clamp(10px, 2.8vw, 12px)", color: "#2D1A0A", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 0 10px", position: "relative" }}>
      <span style={{ fontSize: 15, fontWeight: active ? 800 : 600, color: active ? "#2D1A0A" : "rgba(45,26,10,0.4)" }}>{label}</span>
      {active && <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -1, width: "78%", height: 4, background: "#FFC543", borderRadius: 3, boxShadow: "0 0 10px 1px rgba(255,197,67,0.9)" }} />}
    </button>
  );
}

function ItemCard({ item }: { item: Item }) {
  const online = (item.status ?? "active") === "active";
  return (
    <div style={{ background: "#F9F4E8", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#ece6d8" }}>
        {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <span style={{
          position: "absolute", top: 6, left: 6, fontSize: 10, fontWeight: 700, color: "#fff",
          background: online ? "#5d8f3c" : "#D97A3A", borderRadius: 20, padding: "3px 8px",
        }}>
          {online ? "Online" : "Verification"}
        </span>
      </div>
      <div style={{ padding: "6px 8px 8px" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#2D1A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: "#2D1A0A" }}>
            {item.price_coins ?? 20}
            <span style={{ position: "relative", display: "inline-block", width: 12, height: 12 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
          </span>
          <span style={{ fontSize: 12, color: "#2D1A0A", opacity: 0.6, textDecoration: "underline" }}>Edit →</span>
        </div>
      </div>
    </div>
  );
}

function SunRays() {
  const rays = Array.from({ length: 9 });
  const cx = 85, cy = 80, r1 = 56, r2 = 73;
  return (
    <svg width="170" height="160" viewBox="0 0 170 160"
      style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", overflow: "visible", pointerEvents: "none" }}>
      {rays.map((_, i) => {
        const ang = -Math.PI + (i / (rays.length - 1)) * Math.PI;
        const x1 = cx + Math.cos(ang) * r1, y1 = cy + Math.sin(ang) * r1;
        const x2 = cx + Math.cos(ang) * r2, y2 = cy + Math.sin(ang) * r2;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFC543" strokeWidth="4" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function CameraMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="3" stroke="#FFC543" strokeWidth="2" />
      <path d="M8 7l1.5-2.5h5L16 7" stroke="#FFC543" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3" stroke="#FFC543" strokeWidth="2" />
    </svg>
  );
}

function BigArrow({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h15M13 6l6 6-6 6" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="3" stroke="#FFC543" strokeWidth="2" />
      <path d="M3 10h18" stroke="#FFC543" strokeWidth="2" />
      <circle cx="16.5" cy="14" r="1.4" fill="#FFC543" />
    </svg>
  );
}
