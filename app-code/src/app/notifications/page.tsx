"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Notif = {
  id: string;
  kind: "match" | "like";
  text: string;
  created_at?: string;
  onClick: () => void;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const list: Notif[] = [];

      // 1) Matches involving me → open chat
      try {
        const { data: matches } = await supabase
          .from("matches").select("*")
          .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`)
          .order("created_at", { ascending: false });
        for (const m of (matches ?? [])) {
          const otherId = m.user_a_uid === user.id ? m.user_b_uid : m.user_a_uid;
          let who = "someone";
          try {
            const { data: prof } = await supabase.from("profiles").select("username").eq("id", otherId).single();
            if (prof?.username) who = "@" + prof.username;
          } catch { /* profiles optional */ }
          list.push({
            id: `match-${m.id}`, kind: "match",
            text: `It's a match with ${who}!`,
            created_at: m.created_at,
            onClick: () => router.push(`/chat/${m.id}`),
          });
        }
      } catch { /* matches optional */ }

      // 2) Likes received on my items → open matches
      try {
        const { data: likes } = await supabase
          .from("likes").select("id, created_at, clothing!inner(user_id, title)")
          .eq("clothing.user_id", user.id)
          .order("created_at", { ascending: false }).limit(30);
        for (const l of (likes as unknown as { id: string; created_at?: string; clothing?: { title?: string } }[] ?? [])) {
          list.push({
            id: `like-${l.id}`, kind: "like",
            text: `Someone is interested in your ${l.clothing?.title ?? "item"}`,
            created_at: l.created_at,
            onClick: () => router.push("/matches"),
          });
        }
      } catch { /* likes optional */ }

      // Sort by date desc
      list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
      setNotifs(list);
      setLoading(false);
    }
    init();
  }, [router]);

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(112px + env(safe-area-inset-top))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: 16,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 14, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ margin: 0, color: "#FFC543", fontWeight: 800, fontSize: 24 }}>Notifications</h1>
      </div>

      <div style={{ padding: "20px 18px 120px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 40, fontWeight: 600 }}>Loading…</p>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔔</div>
            <p style={{ color: "#2D1A0A", opacity: 0.6, fontSize: 15 }}>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifs.map((n) => (
              <button
                key={n.id}
                onClick={n.onClick}
                style={{ textAlign: "left", width: "100%", background: "#E8E4DC", borderRadius: 18, padding: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {n.kind === "match" ? <MatchIcon /> : <HeartIcon />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2D1A0A" }}>{n.text}</p>
                  {n.created_at && (
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(45,26,10,0.5)" }}>{relativeDate(n.created_at)}</p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#2D1A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB");
}

function MatchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" fill="#2D1A0A" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z" stroke="#2D1A0A" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
