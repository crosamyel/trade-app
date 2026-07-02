"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Item = { id: string | number; image_url?: string; title?: string; price_coins?: number; coins_value?: number; status?: string };

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("My profile");
  const [fullName, setFullName] = useState("");
  const [initial, setInitial] = useState("?");
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<"articles" | "saved" | "done">("articles");
  const [city, setCity] = useState("Brussels");
  const [bio, setBio] = useState("I would like to trade clothes, what do you got?");
  const [articlesCount, setArticlesCount] = useState(0);
  const [trades, setTrades] = useState(0);
  const [stars, setStars] = useState("—");
  // Friperie
  const [accountType, setAccountType] = useState<"particulier" | "friperie">("particulier");
  const [shopName, setShopName] = useState("");
  const [verifiedBadge, setVerifiedBadge] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState<number | null>(null);
  const [monthlyPosts, setMonthlyPosts] = useState(0);
  const [memberSince, setMemberSince] = useState("2025");
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [toast, setToast] = useState("");
  const [loadingItems, setLoadingItems] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleFocus = () => setRefreshKey(k => k + 1);
    const handleVisibility = () => { if (!document.hidden) setRefreshKey(k => k + 1); };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      setInitial((user.email?.[0] ?? "?").toUpperCase());
      setName(user.email?.split("@")[0] ?? "My profile");
      if (user.created_at) setMemberSince(new Date(user.created_at).getFullYear().toString());

      // Profile (username, coins, city, bio) — select * so a missing column won't crash
      try {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (prof?.username) { setName(prof.username); setInitial(prof.username[0].toUpperCase()); }
        if (prof?.full_name) setFullName(prof.full_name);
        if (typeof prof?.coins_balance === "number") setCoins(prof.coins_balance);
        if (prof?.city) setCity(prof.city);
        if (prof?.bio) setBio(prof.bio);
        if (prof?.account_type) setAccountType(prof.account_type);
        if (prof?.shop_name) setShopName(prof.shop_name);
        if (typeof prof?.verified_badge === "boolean") setVerifiedBadge(prof.verified_badge);
        if (typeof prof?.monthly_post_target === "number") setMonthlyTarget(prof.monthly_post_target);
        if (prof?.avatar_url) setAvatarUrl(prof.avatar_url);
        if (typeof prof?.is_founder === "boolean") setIsFounder(prof.is_founder);
      } catch { /* profiles unavailable */ }

      setLoadingItems(true);
      // My items (real articles)
      const { data: clothes } = await supabase
        .from("clothing").select("id, image_url, title, price_coins, coins_value, status, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      setItems((clothes as Item[]) ?? []);

      // Saved / liked items
      try {
        const { data: likeRows } = await supabase
          .from("likes").select("clothing_id").eq("user_id", user.id);
        const ids = (likeRows ?? []).map((l: { clothing_id: string | number }) => l.clothing_id);
        if (ids.length > 0) {
          const { data: saved } = await supabase.from("clothing").select("id, image_url, title, price_coins, coins_value").in("id", ids);
          setSavedItems((saved as Item[]) ?? []);
        }
      } catch { /* likes table optional */ }
      setLoadingItems(false);

      // Posts ce mois-ci (pour friperies)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: monthCount } = await supabase
        .from("clothing").select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);
      setMonthlyPosts(monthCount ?? 0);

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
  }, [refreshKey]); // eslint-disable-line

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT, animation: "fadeSlideUp 0.22s ease-out both" }}>
      {/* Header — fixed */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingBottom: 14,
      }}>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: "calc(68px + max(env(safe-area-inset-top), 44px))" }} />

      <div style={{ padding: "8px 18px 120px" }}>
        {/* Avatar + rayons */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 26, marginBottom: 8 }}>
          <div style={{ position: "relative", width: 150, height: 130, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <SunRays />
            <div style={{ position: "relative", width: 100, height: 100 }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(255,197,67,0.5)", overflow: "hidden" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ color: "#fff", fontSize: 48, fontWeight: 800 }}>{initial}</span>
                }
              </div>
              {/* Camera — navigates to edit page */}
              <button onClick={() => router.push("/profile/edit")} style={{ position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: "50%", background: "#2D1A0A", border: "2px solid #F9F4E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, zIndex: 1 }}>
                <CameraMini />
              </button>
            </div>
          </div>
        </div>

        {/* Nom + badge friperie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: fullName ? 2 : 6 }}>
          <h1 style={{ textAlign: "center", margin: 0, fontSize: 22, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>
            {accountType === "friperie" && shopName ? shopName : name}
          </h1>
          {isFounder && (
            <>
              <span style={{ background: "#6B21A8", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5 }}>✦ FOUNDER</span>
              <button
                onClick={() => setShowStats(true)}
                style={{ background: "transparent", border: "1.5px solid #6B21A8", color: "#6B21A8", fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 20, cursor: "pointer", letterSpacing: 0.5 }}
              >✦ STATS</button>
            </>
          )}
          {accountType === "friperie" && verifiedBadge && (
            <span style={{ background: "#3c2f22", color: "#FFC543", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>✓ VERIFIED</span>
          )}
          {accountType === "friperie" && !verifiedBadge && (
            <span style={{ background: "#f0e2b8", color: "#8a6d2a", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>🏪 Thrift Store</span>
          )}
        </div>
        {fullName && (
          <p style={{ textAlign: "center", margin: "0 0 6px", fontSize: 14, color: "#9b8f7a", fontWeight: 500 }}>{fullName}</p>
        )}

        {/* Compteur de posts mensuel — friperies uniquement */}
        {accountType === "friperie" && monthlyTarget !== null && (
          <div style={{ margin: "0 20px 14px", background: monthlyPosts >= monthlyTarget ? "#e8f5e0" : "#fff3cd", borderRadius: 16, padding: "10px 16px", border: `1.5px solid ${monthlyPosts >= monthlyTarget ? "#a8d48a" : "#f0c040"}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: monthlyPosts >= monthlyTarget ? "#3d7a1a" : "#7a5a0a" }}>
              {monthlyPosts >= monthlyTarget
                ? `✓ ${monthlyPosts} items published this month — goal reached! (${monthlyTarget})`
                : `⚠ ${monthlyPosts} items published this month — goal: ${monthlyTarget}`
              }
            </p>
          </div>
        )}

        {/* Info */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 18, padding: "0 6px" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#2D1A0A", opacity: 0.7, lineHeight: 1.4, maxWidth: 150 }}>{city}, member since {memberSince}</p>
          <div style={{ width: 1, background: "rgba(45,26,10,0.2)" }} />
          <p style={{ margin: 0, fontSize: 13, color: "#2D1A0A", opacity: 0.7, lineHeight: 1.4, maxWidth: 150, fontStyle: "italic" }}>&quot;{bio}&quot;</p>
        </div>

        {/* Edit profile — outline style */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <button
            className="btn-cta"
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
            className="btn-cta"
            onClick={() => router.push("/wallet")}
            style={{ width: "min(250px, 100%)", height: 52, background: "#2D1A0A", border: "none", borderRadius: 26, color: "#FFC543", fontWeight: 800, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <WalletIcon /> See wallet
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 20, borderBottom: "1px solid rgba(45,26,10,0.12)", marginBottom: 14 }}>
          <Tab label="My articles" active={tab === "articles"} onClick={() => setTab("articles")} />
          <Tab label="★ Saved" active={tab === "saved"} onClick={() => setTab("saved")} />
          <Tab label="Trades done" active={tab === "done"} onClick={() => setTab("done")} />
        </div>

        {/* Grid */}
        {tab === "articles" ? (
          loadingItems ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 16 }} />)}
            </div>
          ) : items.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {items.map((it) => <ItemCard key={String(it.id)} item={it} onEdit={() => router.push(`/edit-clothing/${it.id}`)} />)}
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ color: "#2D1A0A", opacity: 0.55, fontSize: 14, marginBottom: 14 }}>You don&apos;t have any articles yet.</p>
              <button onClick={() => router.push("/upload")} style={{ height: 46, padding: "0 22px", borderRadius: 23, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>+ Add an item</button>
            </div>
          )
        ) : tab === "saved" ? (
          savedItems.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {savedItems.map((it) => (
                <button
                  key={String(it.id)}
                  onClick={() => router.push(`/detail/${it.id}`)}
                  style={{ padding: 0, border: "none", background: "#F9F4E8", borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", textAlign: "left" }}
                >
                  <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#ece6d8" }}>
                    {it.image_url && <Image src={it.image_url} alt={it.title ?? ""} fill style={{ objectFit: "cover" }} sizes="33vw" />}
                  </div>
                  <div style={{ padding: "6px 8px 8px" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#2D1A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title ?? "Item"}</p>
                    <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "#2D1A0A", marginTop: 2 }}>
                      {it.price_coins ?? it.coins_value ?? "?"}
                      <span style={{ position: "relative", display: "inline-block", width: 11, height: 11 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
              <p style={{ color: "#2D1A0A", opacity: 0.55, fontSize: 14 }}>No saved items yet.<br />Tap the star on any item to save it.</p>
            </div>
          )
        ) : (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 30, fontSize: 14 }}>No completed trades yet.</p>
        )}
      </div>
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#2D1A0A", color: "#FFC543", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 22, zIndex: 95, animation: "toastIn 0.22s ease-out both" }}>{toast}</div>
      )}
      {showStats && <StatsOverlay onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ===== Sous-composants ===== */
function StatBubble({ value, label, big }: { value: string; label: string; big?: boolean }) {
  const [displayVal, setDisplayVal] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const num = parseFloat(value);
    if (isNaN(num) || value === "—") { setDisplayVal(value); return; }
    let start: number | null = null;
    const duration = 600;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - (1 - p) * (1 - p);
      setDisplayVal(value.includes(".") ? (eased * num).toFixed(1) : String(Math.round(eased * num)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return (
    <div style={{
      background: "#F9F4E8", border: "1.5px solid #E8E4DC", borderRadius: 18,
      width: "clamp(60px, 18vw, 78px)", padding: "11px 4px", textAlign: "center", flexShrink: 0,
      transform: big ? "scale(1.08)" : "none",
      boxShadow: big ? "0 4px 14px rgba(0,0,0,0.06)" : "none",
    }}>
      <div style={{ fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 800, fontStyle: "italic", color: "#FFC543", lineHeight: 1 }}>{displayVal}</div>
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

function ItemCard({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const online = (item.status ?? "active") === "active";
  return (
    <div style={{ background: "#F9F4E8", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#ece6d8" }}>
        {item.image_url && <Image src={item.image_url} alt={item.title ?? ""} fill style={{ objectFit: "cover" }} sizes="33vw" />}
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
            {item.price_coins ?? item.coins_value ?? "?"}
            <span style={{ position: "relative", display: "inline-block", width: 12, height: 12 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
          </span>
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#2D1A0A", opacity: 0.6, textDecoration: "underline" }}>Edit →</button>
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

type StatsData = {
  usersToday: number; totalUsers: number; activeTrades: number; completedTrades: number;
  itemsThisWeek: number; totalItems: number; pendingItems: number;
  latestUsers: Array<{ username?: string; city?: string; created_at?: string }>;
  latestMatches: Array<{ created_at?: string; trade_status?: string; profiles?: { username?: string } | null }>;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatsOverlay({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        { count: usersToday },
        { count: totalUsers },
        { count: activeTrades },
        { count: completedTrades },
        { count: itemsThisWeek },
        { count: totalItems },
        { count: pendingItems },
        { data: latestUsers },
        { data: latestMatches },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("matches").select("*", { count: "exact", head: true }).in("trade_status", ["proposal_accepted", "both_shipped"]),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("trade_status", "completed"),
        supabase.from("clothing").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
        supabase.from("clothing").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("clothing").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("profiles").select("username, city, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("matches").select("created_at, trade_status, profiles!user_a_uid(username)").order("created_at", { ascending: false }).limit(5),
      ]);

      setData({
        usersToday: usersToday ?? 0,
        totalUsers: totalUsers ?? 0,
        activeTrades: activeTrades ?? 0,
        completedTrades: completedTrades ?? 0,
        itemsThisWeek: itemsThisWeek ?? 0,
        totalItems: totalItems ?? 0,
        pendingItems: pendingItems ?? 0,
        latestUsers: (latestUsers ?? []) as StatsData["latestUsers"],
        latestMatches: (latestMatches ?? []) as StatsData["latestMatches"],
      });
    } catch { /* ok */ }
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []); // eslint-disable-line

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    completed: { bg: "rgba(93,143,60,0.2)", color: "#5d8f3c" },
    proposal_accepted: { bg: "rgba(255,197,67,0.2)", color: "#FFC543" },
    both_shipped: { bg: "rgba(255,197,67,0.2)", color: "#FFC543" },
    cancelled: { bg: "rgba(224,60,60,0.15)", color: "#e03c3c" },
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#1a1a1a", zIndex: 999, overflowY: "auto", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", animation: "statsSlideUp 0.3s ease both" }}
    >
      <style>{`@keyframes statsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ background: "#111", padding: "max(20px, calc(env(safe-area-inset-top,0px) + 16px)) 20px 16px", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#6B21A8" }}>✦ TRADE Live Stats</h2>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>✕</button>
      </div>

      <div style={{ padding: "20px 18px calc(40px + env(safe-area-inset-bottom,0px))" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>Loading…</span>
          </div>
        ) : data ? (
          <>
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { emoji: "👥", label: "Total users", value: data.totalUsers, highlight: false },
                { emoji: "🆕", label: "New today", value: data.usersToday, highlight: data.usersToday > 0 },
                { emoji: "🔄", label: "Active trades", value: data.activeTrades, highlight: false },
                { emoji: "✅", label: "Completed trades", value: data.completedTrades, highlight: false },
                { emoji: "👕", label: "Items this week", value: data.itemsThisWeek, highlight: false },
                { emoji: "📦", label: "Total items", value: data.totalItems, highlight: false },
                { emoji: "⏳", label: "Pending review", value: data.pendingItems, highlight: data.pendingItems > 0 },
              ].map(({ emoji, label, value, highlight }) => (
                <div key={label} style={{ background: "#2a2a2a", borderRadius: 18, padding: "14px 16px", border: highlight ? "1.5px solid rgba(255,197,67,0.35)" : "none" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: highlight ? "#FFC543" : "#fff", lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Latest signups */}
            <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Latest signups</p>
            <div style={{ background: "#2a2a2a", borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
              {data.latestUsers.map((u, i) => (
                <div key={i} style={{ padding: "12px 16px", borderBottom: i < data.latestUsers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>@{u.username ?? "—"}</span>
                    {u.city && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>📍 {u.city}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{u.created_at ? timeAgo(u.created_at) : ""}</span>
                </div>
              ))}
            </div>

            {/* Latest matches */}
            <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Latest matches</p>
            <div style={{ background: "#2a2a2a", borderRadius: 18, overflow: "hidden", marginBottom: 20 }}>
              {data.latestMatches.map((m, i) => {
                const badge = STATUS_BADGE[m.trade_status ?? ""] ?? { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" };
                const username = (m.profiles as { username?: string } | null)?.username;
                return (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i < data.latestMatches.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {username && <span style={{ fontSize: 13, color: "#fff" }}>@{username}</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 8, padding: "2px 7px" }}>{m.trade_status ?? "?"}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.created_at ? timeAgo(m.created_at) : ""}</span>
                  </div>
                );
              })}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchStats}
              style={{ width: "100%", height: 48, borderRadius: 24, border: "1.5px solid rgba(107,33,168,0.5)", background: "transparent", color: "#a855f7", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              ↻ Refresh
            </button>
          </>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 }}>Failed to load stats.</p>
        )}
      </div>
    </div>
  );
}
