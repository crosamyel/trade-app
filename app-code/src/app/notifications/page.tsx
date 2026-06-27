"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Notification = {
  id: string;
  type?: string;
  body?: string;
  read: boolean;
  link?: string;
  created_at?: string;
};

function getEmoji(type?: string) {
  if (type === "match") return "🎉";
  if (type === "proposal_received") return "🔄";
  if (type === "proposal_accepted") return "✅";
  if (type === "proposal_declined") return "❌";
  if (type === "partner_shipped") return "📦";
  if (type === "trade_completed") return "🏆";
  if (type === "rating") return "⭐";
  return "🔔";
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB");
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [useNewTable, setUseNewTable] = useState(false);

  const loadNotifs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    // Try notifications table first
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!error) {
        const list = (data as Notification[]) ?? [];
        setUseNewTable(true);
        setNotifs(list);
        setHasUnread(list.some(n => !n.read));
        setLoading(false);
        return;
      }
    } catch { /* table may not exist yet */ }

    // Fallback: matches only
    const list: Notification[] = [];
    try {
      const { data: matches } = await supabase
        .from("matches").select("id,created_at")
        .or(`user_a_uid.eq.${user.id},user_b_uid.eq.${user.id}`)
        .order("created_at", { ascending: false }).limit(30);
      for (const m of (matches ?? [])) {
        list.push({ id: `match-${m.id}`, type: "match", body: "🎉 New match! Check your messages.", read: true, link: `/chat/${m.id}`, created_at: m.created_at });
      }
    } catch { /* ok */ }
    setNotifs(list);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // Realtime: new notifications for this user
  useEffect(() => {
    let userId: string | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userId = user.id;
      const ch = supabase.channel(`notifs_page:${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          const n = payload.new as Notification;
          setNotifs(prev => [n, ...prev]);
          setHasUnread(true);
        }).subscribe();
      return () => { supabase.removeChannel(ch); };
    });
    return () => { if (userId) supabase.removeChannel(supabase.channel(`notifs_page:${userId}`)); };
  }, []);

  async function markAllRead() {
    if (!useNewTable) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setHasUnread(false);
    } catch { /* ok */ }
  }

  async function tapNotif(n: Notification) {
    if (!n.read && useNewTable) {
      try {
        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
        setNotifs(prev => {
          const updated = prev.map(x => x.id === n.id ? { ...x, read: true } : x);
          setHasUnread(updated.some(x => !x.read));
          return updated;
        });
      } catch { /* ok */ }
    }
    if (n.link) router.push(n.link);
  }

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top, 0px), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: 16,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 14, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ margin: 0, color: "#FFC543", fontWeight: 800, fontSize: 24 }}>Notifications</h1>
        {hasUnread && (
          <button onClick={markAllRead} style={{ position: "absolute", right: 14, bottom: 14, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 14, padding: "5px 12px", cursor: "pointer" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>Mark all read</span>
          </button>
        )}
      </div>

      <div style={{ padding: "16px 16px 120px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 40, fontWeight: 600 }}>Loading…</p>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
            <p style={{ color: "#2D1A0A", fontWeight: 700, fontSize: 17, margin: "0 0 6px" }}>No notifications yet.</p>
            <p style={{ color: "#9b8f7a", fontSize: 14 }}>Start swiping to get matches! 👀</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifs.map(n => {
              const unread = !n.read;
              return (
                <button
                  key={n.id}
                  onClick={() => tapNotif(n)}
                  style={{
                    textAlign: "left", width: "100%", border: "none", cursor: n.link ? "pointer" : "default",
                    background: unread ? "#fff" : "#ede8dc",
                    borderRadius: 18, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                    boxShadow: unread ? "0 2px 12px rgba(0,0,0,0.09)" : "none",
                    borderLeft: unread ? "3px solid #FFC543" : "3px solid transparent",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: unread ? "#FFC543" : "#ccc5b9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 19,
                  }}>
                    {getEmoji(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: unread ? 700 : 500, color: unread ? "#2D1A0A" : "#7a6f5d", lineHeight: 1.4 }}>{n.body ?? "Notification"}</p>
                    {n.created_at && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: unread ? "#9b8f7a" : "#b5aeA4" }}>{relativeDate(n.created_at)}</p>
                    )}
                  </div>
                  {n.link && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={unread ? "#3c2f22" : "#b5aeA4"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
