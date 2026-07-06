"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProposalSheet } from "@/app/home/page";
import type { CardData } from "@/components/SwipeCard";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Clothing = {
  id: string | number;
  user_id: string;
  image_url?: string;
  image_back_url?: string;
  image_label_url?: string;
  image_detail_url?: string;
  title?: string;
  brand?: string;
  size?: string;
  condition?: string;
  style?: string;
  description?: string;
  coins_value?: number;
  location?: string;
  profiles?: { username?: string; avatar_url?: string; city?: string } | null;
};

type MyItem = {
  id: string | number;
  user_id: string;
  image_url?: string;
  title?: string;
  location?: string;
  size?: string;
  condition?: string;
  views?: number;
  distance?: number;
  profiles?: { username?: string; avatar_url?: string } | null;
};

function condLabel(condition?: string): { label: string; bg: string } {
  const c = (condition ?? "").toLowerCase().replace(/[^a-z_]/g, "");
  if (c === "new") return { label: "New", bg: "#5d8f3c" };
  if (c === "like_new" || c === "likenew") return { label: "Like new", bg: "#3a7bd5" };
  if (c === "good") return { label: "Good", bg: "#D97A3A" };
  if (c === "used") return { label: "Used", bg: "#8f6c3c" };
  if (c === "worn") return { label: "Worn", bg: "#7a3c3c" };
  // Legacy French values
  if (condition?.includes("neuf") && !condition?.includes("comme")) return { label: "New", bg: "#5d8f3c" };
  if (condition?.includes("comme") || condition?.includes("like")) return { label: "Like new", bg: "#3a7bd5" };
  return { label: "Good", bg: "#D97A3A" };
}

export default function DetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const router = useRouter();

  const [item, setItem] = useState<Clothing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  function goBack() {
    setClosing(true);
    setTimeout(() => router.back(), 280);
  }

  const [me, setMe] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [myCoins, setMyCoins] = useState(0);
  const [proposing, setProposing] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      // Check if already saved
      try {
        const { data: like } = await supabase.from("likes")
          .select("id").eq("user_id", user.id).eq("clothing_id", id).maybeSingle();
        if (like) setSaved(true);
      } catch { /* likes optional */ }

      // Article + profil vendeur
      let clothingData: Clothing | null = null;
      const joined = await supabase
        .from("clothing")
        .select("*, profiles(username, avatar_url, city)")
        .eq("id", id)
        .single();
      if (joined.error) {
        const plain = await supabase.from("clothing").select("*").eq("id", id).single();
        clothingData = plain.data as Clothing;
      } else {
        clothingData = joined.data as Clothing;
      }

      // If profiles join returned nothing (RLS / FK missing), fetch separately
      if (clothingData && !clothingData.profiles && clothingData.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url, city")
          .eq("id", clothingData.user_id)
          .maybeSingle();
        if (prof) clothingData = { ...clothingData, profiles: prof };
      }

      setItem(clothingData);

      // Mes articles (pour la proposition d'échange)
      const { data: mine } = await supabase
        .from("clothing").select("*").eq("user_id", user.id).eq("status", "active");
      setMyItems((mine as MyItem[]) ?? []);

      // Mes coins
      try {
        const { data: prof } = await supabase
          .from("profiles").select("coins_balance").eq("id", user.id).single();
        if (typeof prof?.coins_balance === "number") setMyCoins(prof.coins_balance);
      } catch { /* ok */ }

      setLoading(false);
    }
    init();
  }, [id, router]);

  function toCard(it: MyItem): CardData {
    return {
      id: String(it.id),
      photo: it.image_url ?? "/card-photo-01.png",
      title: it.title ?? "Item",
      location: it.location ?? "Brussels",
      username: it.profiles?.username ?? "user",
      views: it.views ?? 0,
      distance: it.distance ? `${it.distance}km` : "?km",
      size: it.size ?? "?",
      condition: it.condition ?? "Good",
    };
  }

  async function sendProposal(myItem: MyItem, offeredCoins: number) {
    setProposing(false);
    if (!item || !me) return;
    try {
      await supabase.from("likes").insert({
        user_id: me,
        clothing_id: item.id,
        offered_clothing_id: myItem.id,
        ...(offeredCoins > 0 ? { offered_coins: offeredCoins } : {}),
      });
      const { data: matchCheck } = await supabase
        .from("likes").select("clothing_id, clothing!inner(user_id)")
        .eq("clothing.user_id", me).eq("user_id", item.user_id);
      if (matchCheck && matchCheck.length > 0) {
        await supabase.from("matches").insert({
          user_a_uid: me, user_b_uid: item.user_id,
          clothing_a_id: matchCheck[0].clothing_id, clothing_b_id: item.id,
        });
        router.push("/matches");
      } else {
        router.back();
      }
    } catch (e) { console.error("proposal:", e); }
  }

  if (loading) return (
    <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "#3c2f22", fontWeight: 600, opacity: 0.5 }}>Loading…</span>
    </div>
  );

  if (!item) return (
    <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: FONT }}>
      <p style={{ color: "#3c2f22", fontWeight: 600 }}>Item not found.</p>
      <button onClick={goBack} style={{ padding: "10px 22px", background: "#FFC543", border: "none", borderRadius: 22, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>← Go back</button>
    </div>
  );

  const photos = [item.image_url, item.image_back_url, item.image_label_url, item.image_detail_url].filter(Boolean) as string[];
  if (photos.length === 0) photos.push("/card-photo-01.png");
  const currentPhoto = photos[photoIndex] ?? "/card-photo-01.png";

  const username = item.profiles?.username ?? "user";
  const city = item.profiles?.city ?? "Brussels";
  const initial = username[0]?.toUpperCase() ?? "?";
  const cond = condLabel(item.condition);
  const isMyItem = me === item.user_id;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && photoIndex < photos.length - 1) setPhotoIndex(i => i + 1);
    if (dx > 0 && photoIndex > 0) setPhotoIndex(i => i - 1);
  }

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#f9f4e8", fontFamily: FONT, minHeight: "100dvh", overflowY: "auto", overflowX: "hidden", animation: closing ? "slideDownDetail 0.28s cubic-bezier(0.4,0,0.2,1) both" : "slideUpDetail 0.38s cubic-bezier(0.4,0,0.2,1) both" }}>
      <style>{`
        @keyframes slideUpDetail {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDownDetail {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(80px); opacity: 0; }
        }
      `}</style>

      {/* ===== PHOTO pleine hauteur ===== */}
      <div
        style={{ position: "relative", width: "100%", height: "100dvh", background: "#ece6d8", flexShrink: 0 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={currentPhoto} alt={item.title ?? "Item"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

        {/* Gradient bas */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />

        {/* Boutons haut (retour + save) */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "calc(80px + env(safe-area-inset-top))",
          paddingTop: "env(safe-area-inset-top)",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          padding: "env(safe-area-inset-top) 16px 14px",
          boxSizing: "border-box", zIndex: 10,
        }}>
          <button onClick={goBack} style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
            <svg width="18" height="14" viewBox="0 0 22 16" fill="none">
              <path d="M21 8H1M1 8L8 1M1 8L8 15" stroke="#3c2f22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={async () => {
            if (!me || !item) return;
            if (!saved) {
              setSaved(true);
              await supabase.from("likes").upsert(
                { user_id: me, clothing_id: item.id },
                { onConflict: "user_id,clothing_id" }
              );
            } else {
              setSaved(false);
              await supabase.from("likes").delete().eq("user_id", me).eq("clothing_id", item.id);
            }
          }} style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.88)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
            <StarIcon filled={saved} />
          </button>
        </div>

        {/* Badge condition */}
        <div style={{ position: "absolute", bottom: 52, left: 16, background: cond.bg, borderRadius: 20, padding: "5px 13px", zIndex: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{cond.label}</span>
        </div>

        {/* Indicateurs photos */}
        {photos.length > 1 && (
          <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 5 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={() => setPhotoIndex(i)} style={{
                width: i === photoIndex ? 24 : 8, height: 8, borderRadius: 4, padding: 0, border: "none", cursor: "pointer",
                background: i === photoIndex ? "#FFC543" : "rgba(255,255,255,0.5)",
                transition: "width 0.2s ease, background 0.2s ease",
              }} />
            ))}
          </div>
        )}
      </div>

      {/* ===== CONTENU ===== */}
      <div style={{ background: "#f9f4e8", position: "relative", paddingBottom: 120 }}>

        {/* Burst décoratif */}
        <div style={{ position: "absolute", top: "3%", left: "50%", transform: "translateX(-50%)", width: 420, height: 420, pointerEvents: "none", zIndex: 0, opacity: 0.45 }}>
          <Image src="/detail-burst.png" alt="" fill style={{ objectFit: "contain" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Titre */}
          <div style={{ padding: "18px 16px 0" }}>
            <p style={{ fontSize: 30, fontWeight: 800, fontStyle: "italic", color: "#3c2f22", margin: 0, lineHeight: 1.1 }}>
              {item.title ?? "Item"}
            </p>
          </div>

          {/* Tags */}
          <div style={{ padding: "12px 16px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {item.size && <TagPill bg="#3c2f22" color="#fff">Size {item.size}</TagPill>}
            {item.condition && <TagPill bg={cond.bg} color="#fff">{cond.label}</TagPill>}
            {item.brand && <TagPill bg="#f0e1b1" color="#91691a">{item.brand}</TagPill>}
            {item.style && <TagPill bg="#ede8dc" color="#3c2f22">{item.style}</TagPill>}
            <TagPill bg="#FFC543" color="#3c2f22">{item.coins_value ?? "?"} coins</TagPill>
          </div>

          {/* Carte vendeur — cliquable pour voir le profil */}
          <div
            onClick={() => router.push(`/shop/${item.user_id}`)}
            style={{ margin: "16px 14px 0", background: "#3c2f22", borderRadius: 999, padding: "14px 18px 14px 14px", display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFC543", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {item.profiles?.avatar_url
                ? <img src={item.profiles.avatar_url} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                : <span style={{ fontSize: 30, fontWeight: 800, fontStyle: "italic", color: "#fff" }}>{initial}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, fontStyle: "italic", color: "#fff", lineHeight: 1 }}>@{username}</p>
              <p style={{ margin: "5px 0 0", fontSize: 13, color: "rgba(255,255,255,0.62)" }}>📍 {city}</p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div style={{ margin: "10px 14px 0", background: "#3c2f22", borderRadius: 24, padding: "16px 24px 18px", textAlign: "center" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "rgba(255,185,46,0.9)" }}>Description</p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.74)", lineHeight: 1.6 }}>{item.description}</p>
            </div>
          )}

          {/* CTAs */}
          <div style={{ padding: "14px 14px 0", display: "flex", gap: 10 }}>
            {isMyItem ? (
              <button
                onClick={() => router.push(`/edit-clothing/${item.id}`)}
                style={{ flex: 1, height: 72, borderRadius: 999, background: "#3c2f22", border: "2.5px solid #FFC543", cursor: "pointer", fontSize: 17, fontWeight: 800, color: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                Edit this item →
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push("/matches")}
                  style={{ flex: 1, height: 72, borderRadius: 999, background: "#f9f4e8", border: "2.5px solid #FFC543", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                >
                  <MsgIcon />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#c08612" }}>Message</span>
                </button>
                <button
                  onClick={() => setProposing(true)}
                  style={{ flex: 1, height: 72, borderRadius: 999, background: "#FFC543", border: "none", cursor: "pointer", fontSize: 22, fontWeight: 800, fontStyle: "italic", color: "#3c2f22", boxShadow: "0 6px 18px rgba(255,197,67,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  Trade
                  <svg width="24" height="20" viewBox="0 0 28 22" fill="none"><path d="M1 11H27M27 11L16 1M27 11L16 21" stroke="#3c2f22" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ProposalSheet */}
      {proposing && (
        <ProposalSheet
          target={item as never}
          myItems={myItems as never}
          available={myCoins}
          toCard={toCard as never}
          onCancel={() => setProposing(false)}
          onSend={sendProposal as never}
          onAddItem={() => router.push("/upload")}
        />
      )}
    </div>
  );
}

function TagPill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, borderRadius: 999, padding: "6px 14px", fontSize: 14, fontWeight: 600, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="19" viewBox="0 0 22 21" fill="none">
      <path d="M11 1.5L13.8 8.3L21 9.1L15.8 13.9L17.4 21L11 17.3L4.6 21L6.2 13.9L1 9.1L8.2 8.3L11 1.5Z"
        fill={filled ? "#ffc543" : "rgba(255,197,67,0.15)"}
        stroke="#ffc543" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MsgIcon() {
  return (
    <svg width="24" height="22" viewBox="0 0 28 24" fill="none">
      <rect x="3" y="3" width="18" height="13" rx="2.5" stroke="#ffc543" strokeWidth="2.2" opacity="0.5" />
      <rect x="7" y="7" width="18" height="13" rx="2.5" stroke="#ffc543" strokeWidth="2.2" />
      <path d="M7 7l9 6 9-6" stroke="#ffc543" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
