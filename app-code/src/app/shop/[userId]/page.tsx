"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Profile = {
  id: string;
  username?: string;
  avatar_url?: string;
  city?: string;
  account_type?: string;
  shop_name?: string;
  bio?: string;
  instagram?: string;
  website?: string;
  coins_balance?: number;
};

type Clothing = {
  id: string | number;
  image_url?: string;
  title?: string;
  brand?: string;
  size?: string;
  coins_value?: number;
  created_at?: string;
};

export default function ShopPage() {
  const params = useParams();
  const userId = Array.isArray(params.userId) ? params.userId[0] : (params.userId as string);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Clothing[]>([]);
  const [tradesCount, setTradesCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  async function handleContact() {
    setContacting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Look for any existing conversation between the two users
    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user_a_uid.eq.${user.id},user_b_uid.eq.${userId}),and(user_a_uid.eq.${userId},user_b_uid.eq.${user.id})`)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      router.push(`/chat/${existing.id}`);
      return;
    }

    // Create a new direct chat (no clothing items attached)
    const { data: created, error } = await supabase
      .from("matches")
      .insert({ user_a_uid: user.id, user_b_uid: userId })
      .select("id")
      .single();

    if (error) { console.error("create chat:", error); setContacting(false); return; }
    router.push(`/chat/${created.id}`);
  }

  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(prof as Profile ?? null);

      const { data: clothing } = await supabase
        .from("clothing")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setItems((clothing as Clothing[]) ?? []);

      // Count trades
      const { count: tc } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .or(`user_a_uid.eq.${userId},user_b_uid.eq.${userId}`);
      setTradesCount(tc ?? 0);

      // Count items listed this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: mc } = await supabase
        .from("clothing")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString());
      setMonthlyCount(mc ?? 0);

      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) return (
    <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "#3c2f22", fontWeight: 600, opacity: 0.5 }}>Loading…</span>
    </div>
  );

  if (!profile) return (
    <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: FONT }}>
      <p style={{ color: "#3c2f22", fontWeight: 600 }}>Shop not found.</p>
      <button onClick={() => router.back()} style={{ padding: "10px 22px", background: "#FFC543", border: "none", borderRadius: 22, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>← Go back</button>
    </div>
  );

  const shopName = profile.shop_name ?? profile.username ?? "Thrift Store";
  const initial = shopName[0]?.toUpperCase() ?? "?";
  const isThrift = profile.account_type === "friperie";

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#f9f4e8", fontFamily: FONT, minHeight: "100dvh", overflowY: "auto", animation: "slideUpDetail 0.38s cubic-bezier(0.4,0,0.2,1) both" }}>
      <style>{`
        @keyframes slideUpDetail {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#3c2f22",
        paddingTop: "max(20px, calc(env(safe-area-inset-top, 0px) + 12px))",
        paddingBottom: 28,
        paddingLeft: 20,
        paddingRight: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{ position: "absolute", left: 18, top: "max(20px, calc(env(safe-area-inset-top, 0px) + 12px))", width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="18" height="14" viewBox="0 0 22 16" fill="none">
            <path d="M21 8H1M1 8L8 1M1 8L8 15" stroke="#FFC543" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Avatar */}
        <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "3px solid rgba(255,255,255,0.2)", marginBottom: 14 }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : <span style={{ fontSize: 36, fontWeight: 800, fontStyle: "italic", color: "#3c2f22" }}>{initial}</span>
          }
        </div>

        {/* Name + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontStyle: "italic" }}>{shopName}</span>
          {isThrift && (
            <div style={{ background: "#FFC543", borderRadius: 8, padding: "2px 8px", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#3c2f22" }}>✓ Thrift Store</span>
            </div>
          )}
        </div>

        {/* Username */}
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>@{profile.username ?? "user"}</p>

        {/* Location */}
        {profile.city && (
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 4 }}>
            📍 {profile.city}
          </p>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "20px 18px 120px" }}>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {[
            { value: items.length, label: "Articles" },
            { value: tradesCount, label: "Trades" },
            { value: monthlyCount, label: "This month" },
          ].map(({ value, label }) => (
            <div key={label} style={{ flex: 1, background: "#fff", borderRadius: 18, padding: "14px 10px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#3c2f22" }}>{value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9b8f7a", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "16px 18px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "#3c2f22", lineHeight: 1.6 }}>{profile.bio}</p>
          </div>
        )}

        {/* Social links */}
        {(profile.instagram || profile.website) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, height: 44, background: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, textDecoration: "none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2" fill="none" /><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.2" fill="white" /></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Instagram</span>
              </a>
            )}
            {profile.website && (
              <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, height: 44, background: "#3c2f22", borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, textDecoration: "none" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FFC543" strokeWidth="2"/><path d="M2 12h20M12 2c-2.5 3-4 6-4 10s1.5 7 4 10M12 2c2.5 3 4 6 4 10s-1.5 7-4 10" stroke="#FFC543" strokeWidth="2"/></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFC543" }}>Website</span>
              </a>
            )}
          </div>
        )}

        {/* Items grid title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#3c2f22" }}>
            {items.length > 0 ? `${items.length} items` : "No items yet"}
          </h2>
        </div>

        {/* Items grid */}
        {items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {items.map((it) => (
              <button
                key={String(it.id)}
                onClick={() => router.push(`/detail/${it.id}`)}
                style={{ textAlign: "left", padding: 0, border: "none", background: "#fff", borderRadius: 18, overflow: "hidden", cursor: "pointer", boxShadow: "0 3px 10px rgba(0,0,0,0.06)" }}
              >
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "#ece6d8" }}>
                  {it.image_url && <img src={it.image_url} alt={it.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ padding: "10px 10px 12px" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#2D1A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title ?? "Item"}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "#9b8f7a" }}>{it.brand ?? "—"} · {it.size ?? "?"}</span>
                    {it.coins_value && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#3c2f22" }}>{it.coins_value} 🪙</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 16px", background: "#fff", borderRadius: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}>🧥</p>
            <p style={{ margin: 0, color: "#9b8f7a", fontSize: 14 }}>No active items yet</p>
          </div>
        )}
      </div>

      {/* Contact CTA */}
      <div style={{ position: "fixed", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 48px)", maxWidth: 432, zIndex: 30 }}>
        <button
          onClick={handleContact}
          disabled={contacting}
          style={{ width: "100%", height: 58, borderRadius: 999, background: "#FFC543", border: "none", cursor: contacting ? "not-allowed" : "pointer", fontSize: 18, fontWeight: 800, color: "#3c2f22", boxShadow: "0 8px 24px rgba(255,197,67,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: contacting ? 0.7 : 1 }}
        >
          {contacting ? "Opening chat…" : "Contact"}
          {!contacting && (
            <svg width="22" height="18" viewBox="0 0 28 22" fill="none">
              <path d="M1 11H27M27 11L16 1M27 11L16 21" stroke="#3c2f22" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
