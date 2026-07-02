"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type MatchRow = {
  id: string;
  user_a_uid: string;
  user_b_uid: string;
  clothing_a_id: number | string | null;
  clothing_b_id: number | string | null;
  trade_status?: string | null;
  created_at?: string;
};
type ClothingLite = { id: number | string; image_url?: string; title?: string };
type ProfileLite = { id: string; username?: string; avatar_url?: string };
type MessageLite = { match_id: string; body?: string; created_at?: string };

function relativeDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function StatusBadge({ status }: { status?: string | null }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    matched:           { label: "Match! 🎉",      bg: "#FFF8E7", color: "#8a6d2a" },
    proposal_sent:     { label: "Proposal sent",  bg: "#E3EEFF", color: "#2457a0" },
    proposal_accepted: { label: "Accepted ✓",     bg: "#E5F5DC", color: "#3d7a1a" },
    both_shipped:      { label: "Shipped 📦",      bg: "#FFF0E0", color: "#a05a00" },
    completed:         { label: "Done 🏆",         bg: "#D8F0D8", color: "#1a5c1a" },
    disputed:          { label: "Disputed ⚠",     bg: "#FFDEDE", color: "#a02020" },
  };
  const key = status ?? "matched";
  const c = cfg[key] ?? cfg["matched"];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, padding: "3px 9px", borderRadius: 12 }}>
      {c.label}
    </span>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [clothingMap, setClothingMap] = useState<Record<string, ClothingLite>>({});
  const [profileMap, setProfileMap] = useState<Record<string, ProfileLite>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, MessageLite>>({});
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      try {
        const { data: rows } = await supabase
          .from("matches")
          .select("id, user_a_uid, user_b_uid, clothing_a_id, clothing_b_id, trade_status, created_at")
          .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`)
          .order("created_at", { ascending: false });

        const list = (rows as MatchRow[]) ?? [];
        setMatches(list);

        // Clothing thumbnails
        const clothingIds = Array.from(new Set(
          list.flatMap((m) => [m.clothing_a_id, m.clothing_b_id]).filter(Boolean)
        ));
        if (clothingIds.length > 0) {
          const { data: clothes } = await supabase
            .from("clothing").select("id, image_url, title").in("id", clothingIds);
          const map: Record<string, ClothingLite> = {};
          (clothes as ClothingLite[] ?? []).forEach((c) => { map[String(c.id)] = c; });
          setClothingMap(map);
        }

        // Other user profiles
        const otherIds = Array.from(new Set(
          list.map((m) => m.user_a_uid === user.id ? m.user_b_uid : m.user_a_uid)
        ));
        if (otherIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles").select("id, username, avatar_url").in("id", otherIds);
          const pmap: Record<string, ProfileLite> = {};
          (profs as ProfileLite[] ?? []).forEach((p) => { pmap[p.id] = p; });
          setProfileMap(pmap);
        }

        // Last messages
        const matchIds = list.map((m) => m.id);
        if (matchIds.length > 0) {
          try {
            const { data: msgs } = await supabase
              .from("messages")
              .select("match_id, body, created_at")
              .in("match_id", matchIds)
              .order("created_at", { ascending: false });
            const mmap: Record<string, MessageLite> = {};
            (msgs as MessageLite[] ?? []).forEach((msg) => {
              if (!mmap[msg.match_id]) mmap[msg.match_id] = msg;
            });
            setLastMessages(mmap);
          } catch { /* messages table optional */ }
        }
      } catch (e) {
        console.error("matches error:", e);
      }
      setLoading(false);
    }
    init();
  }, [router]);

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

      <div style={{ padding: "20px 18px 120px" }}>
        <h1 style={{ margin: "0 0 18px", textAlign: "center", fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>My matches</h1>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 20 }} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
            <p style={{ color: "#2D1A0A", opacity: 0.65, fontSize: 15, lineHeight: 1.5 }}>No matches yet.<br />Swipe clothes to find some!</p>
            <button onClick={() => router.push("/home")} style={{ marginTop: 20, height: 52, padding: "0 26px", borderRadius: 26, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Go swipe
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {matches.map((m, idx) => {
              const mineIsA = m.user_a_uid === me;
              const myCloth = clothingMap[String(mineIsA ? m.clothing_a_id : m.clothing_b_id)];
              const theirCloth = clothingMap[String(mineIsA ? m.clothing_b_id : m.clothing_a_id)];
              const otherId = mineIsA ? m.user_b_uid : m.user_a_uid;
              const other = profileMap[otherId];
              const lastMsg = lastMessages[m.id];
              const initial = (other?.username?.[0] ?? "?").toUpperCase();

              return (
                <button
                  key={m.id}
                  onClick={() => router.push(`/chat/${m.id}`)}
                  style={{
                    textAlign: "left", width: "100%", border: "none", cursor: "pointer",
                    background: "#fff", borderRadius: 20, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 14,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                    animation: `listItemIn 0.22s ease-out ${Math.min(idx, 4) * 50}ms both`,
                  }}
                >
                  {/* Other user avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFC543", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {other?.avatar_url
                      ? <img src={other.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" loading="lazy" />
                      : <span style={{ fontSize: 22, fontWeight: 800, color: "#3c2f22" }}>{initial}</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, color: "#2D1A0A", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        @{other?.username ?? "user"}
                      </span>
                      <StatusBadge status={m.trade_status} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#7a6f5d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastMsg?.body ?? (theirCloth?.title ? `🧥 ${theirCloth.title}` : "New match!")}
                    </p>
                  </div>

                  {/* Thumbnails + time */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "#b5aeA4", fontWeight: 500 }}>
                      {relativeDate(lastMsg?.created_at ?? m.created_at)}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Thumb src={myCloth?.image_url} />
                      <Thumb src={theirCloth?.image_url} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Thumb({ src }: { src?: string }) {
  return (
    <div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "#d8d2c4", flexShrink: 0 }}>
      {src
        ? <Image src={src} alt="" fill style={{ objectFit: "cover" }} sizes="36px" />
        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧥</div>}
    </div>
  );
}
