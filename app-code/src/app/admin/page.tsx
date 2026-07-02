"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const ADMIN_EMAIL = "crosamyel@gmail.com";

type PendingItem = {
  id: string; title?: string; brand?: string; size?: string; condition?: string;
  image_url?: string; created_at?: string;
  profiles?: { username?: string } | null;
};
type DisputedMatch = {
  id: string; user_a_uid: string; user_b_uid: string;
  trade_status?: string; created_at?: string;
  userA?: string; userB?: string;
};
type FriperieProfile = {
  id: string; username?: string; shop_name?: string; city?: string;
  created_at?: string; verified_badge?: boolean; item_count?: number;
};
type UserProfile = {
  id: string; username?: string; full_name?: string; account_type?: string; city?: string;
  coins_balance?: number; created_at?: string; item_count?: number;
  banned?: boolean; verified_badge?: boolean;
};
type AllItem = {
  id: string; title?: string; brand?: string; size?: string; condition?: string;
  coins_value?: number; image_url?: string; created_at?: string;
  status?: string; featured?: boolean;
  profiles?: { username?: string } | null;
};
type AdRow = {
  id: string; advertiser_name?: string; image_url?: string; link_url?: string;
  cta_text?: string; active?: boolean; created_at?: string;
};
type UserStats = { itemCount: number; tradeCount: number; avgRating: string };

type Tab = "pending" | "disputes" | "fripers" | "users" | "allitems" | "notifications" | "ads";

const STATUS_COLOR: Record<string, string> = {
  active: "#5d8f3c",
  pending_review: "#FFC543",
  rejected: "#e03c3c",
};

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [fripers, setFripers] = useState<FriperieProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allItems, setAllItems] = useState<AllItem[]>([]);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Notifications
  const [notifMsg, setNotifMsg] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifSentCount, setNotifSentCount] = useState<number | null>(null);

  // User stats modal
  const [userStatsTarget, setUserStatsTarget] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingUserStats, setLoadingUserStats] = useState(false);

  // Ads form
  const [showAddAd, setShowAddAd] = useState(false);
  const [newAd, setNewAd] = useState({ advertiser_name: "", image_url: "", link_url: "", cta_text: "" });
  const [addingAd, setAddingAd] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) { router.replace("/home"); return; }
      setAuthorized(true);
    });
  }, [router]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clothing")
      .select("*, profiles(username)").eq("status", "pending_review")
      .order("created_at", { ascending: false });
    setPendingItems((data as PendingItem[]) ?? []);
    setLoading(false);
  }, []);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("matches")
        .select("id, created_at, trade_status, user_a_uid, user_b_uid")
        .eq("trade_status", "disputed").order("created_at", { ascending: false });
      if (!data) { setLoading(false); return; }
      const uids = [...new Set(data.flatMap(m => [m.user_a_uid, m.user_b_uid]))];
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", uids);
      const nameMap: Record<string, string> = {};
      for (const p of profs ?? []) nameMap[p.id] = p.username ?? "?";
      setDisputes(data.map(m => ({
        ...m,
        userA: nameMap[m.user_a_uid] ?? m.user_a_uid.slice(0, 8) + "…",
        userB: nameMap[m.user_b_uid] ?? m.user_b_uid.slice(0, 8) + "…",
      })));
    } catch { /* ok */ }
    setLoading(false);
  }, []);

  const loadFripers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*")
      .eq("account_type", "friperie").order("created_at", { ascending: false });
    if (!data) { setLoading(false); return; }
    const ids = data.map(p => p.id);
    const itemCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: c } = await supabase.from("clothing").select("user_id").in("user_id", ids);
      for (const r of c ?? []) itemCounts[r.user_id] = (itemCounts[r.user_id] ?? 0) + 1;
    }
    setFripers(data.map(p => ({ ...p, item_count: itemCounts[p.id] ?? 0 })) as FriperieProfile[]);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      console.log("[admin/users] status:", res.status, "body:", JSON.stringify(json));
      if (res.ok && json.users) {
        setUsers(json.users as UserProfile[]);
      } else {
        console.error("[admin/users] error:", json.error ?? "unknown");
      }
    } catch (e) {
      console.error("[admin/users] fetch failed:", e);
    }
    setLoading(false);
  }, []);

  const loadAllItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clothing")
      .select("id, title, brand, size, condition, coins_value, image_url, created_at, status, featured, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(200);
    setAllItems((data as AllItem[]) ?? []);
    setLoading(false);
  }, []);

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
      setAds((data as AdRow[]) ?? []);
    } catch { /* ads table may not exist */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    if (tab === "pending") loadPending();
    else if (tab === "disputes") loadDisputes();
    else if (tab === "fripers") loadFripers();
    else if (tab === "users") loadUsers();
    else if (tab === "allitems") loadAllItems();
    else if (tab === "ads") loadAds();
  }, [authorized, tab, loadPending, loadDisputes, loadFripers, loadUsers, loadAllItems, loadAds]);

  // Pending actions
  async function approveItem(id: string) {
    await supabase.from("clothing").update({ status: "active" }).eq("id", id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  }
  async function rejectItem(id: string) {
    await supabase.from("clothing").update({ status: "rejected" }).eq("id", id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  }

  // Dispute actions
  async function completeDispute(matchId: string) {
    await supabase.from("matches").update({ trade_status: "completed", status: "completed" }).eq("id", matchId);
    setDisputes(prev => prev.filter(m => m.id !== matchId));
  }
  async function cancelTrade(matchId: string) {
    await supabase.from("matches").update({ trade_status: "cancelled" }).eq("id", matchId);
    setDisputes(prev => prev.filter(m => m.id !== matchId));
  }

  // Friper actions
  async function toggleBadge(profileId: string, current: boolean) {
    await supabase.from("profiles").update({ verified_badge: !current }).eq("id", profileId);
    setFripers(prev => prev.map(f => f.id === profileId ? { ...f, verified_badge: !current } : f));
  }

  // All Items actions
  async function approveAllItem(id: string) {
    await supabase.from("clothing").update({ status: "active" }).eq("id", id);
    setAllItems(prev => prev.map(i => i.id === id ? { ...i, status: "active" } : i));
  }
  async function rejectAllItem(id: string) {
    await supabase.from("clothing").update({ status: "rejected" }).eq("id", id);
    setAllItems(prev => prev.map(i => i.id === id ? { ...i, status: "rejected" } : i));
  }
  async function featureItem(id: string, current: boolean) {
    await supabase.from("clothing").update({ featured: !current }).eq("id", id);
    setAllItems(prev => prev.map(i => i.id === id ? { ...i, featured: !current } : i));
  }
  async function deleteItem(id: string) {
    await supabase.from("clothing").delete().eq("id", id);
    setAllItems(prev => prev.filter(i => i.id !== id));
  }

  // User actions
  async function banUser(id: string, current: boolean) {
    await supabase.from("profiles").update({ banned: !current }).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: !current } : u));
  }
  async function deleteUser(id: string, username: string) {
    if (!confirm(`⚠️ Delete @${username}? This will permanently remove their account, all items, matches and messages. This cannot be undone.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) { alert("Error: " + data.error); return; }
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert("Delete failed — try again");
    }
  }
  async function verifyUser(id: string, current: boolean) {
    await supabase.from("profiles").update({ verified_badge: !current }).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, verified_badge: !current } : u));
  }
  async function loadUserStats(u: UserProfile) {
    setUserStatsTarget(u);
    setUserStats(null);
    setLoadingUserStats(true);
    try {
      const { count: itemCount } = await supabase.from("clothing")
        .select("*", { count: "exact", head: true }).eq("user_id", u.id);
      const { count: tradeCount } = await supabase.from("matches")
        .select("*", { count: "exact", head: true })
        .or(`user_a_uid.eq.${u.id},user_b_uid.eq.${u.id}`)
        .eq("trade_status", "completed");
      let avgRating = "—";
      try {
        const { data: r } = await supabase.from("ratings").select("stars").eq("rated_id", u.id);
        if (r && r.length > 0) {
          const avg = r.reduce((s: number, x: { stars: number }) => s + x.stars, 0) / r.length;
          avgRating = avg.toFixed(1);
        }
      } catch { /* ratings may not exist */ }
      setUserStats({ itemCount: itemCount ?? 0, tradeCount: tradeCount ?? 0, avgRating });
    } catch { /* ok */ }
    setLoadingUserStats(false);
  }

  // Notification actions
  async function sendNotification() {
    if (!notifMsg.trim()) return;
    setNotifSending(true);
    setNotifSentCount(null);
    try {
      const { data: allProfiles } = await supabase.from("profiles").select("id");
      if (!allProfiles || allProfiles.length === 0) { setNotifSending(false); return; }
      const notifications = allProfiles.map(p => ({
        user_id: p.id, type: "announcement", body: notifMsg.trim(), read: false, link: "/home",
      }));
      await supabase.from("notifications").insert(notifications);
      setNotifSentCount(allProfiles.length);
      setNotifMsg("");
    } catch { /* ok */ }
    setNotifSending(false);
  }

  // Ads actions
  async function toggleAd(id: string, current: boolean) {
    await supabase.from("ads").update({ active: !current }).eq("id", id);
    setAds(prev => prev.map(a => a.id === id ? { ...a, active: !current } : a));
  }
  async function deleteAd(id: string) {
    await supabase.from("ads").delete().eq("id", id);
    setAds(prev => prev.filter(a => a.id !== id));
  }
  async function addAd() {
    if (!newAd.advertiser_name || !newAd.image_url) return;
    setAddingAd(true);
    try {
      const { data } = await supabase.from("ads").insert({ ...newAd, active: false }).select().single();
      if (data) setAds(prev => [data as AdRow, ...prev]);
      setNewAd({ advertiser_name: "", image_url: "", link_url: "", cta_text: "" });
      setShowAddAd(false);
    } catch { /* ok */ }
    setAddingAd(false);
  }

  if (authorized === null) {
    return (
      <div style={{ background: "#1a1a1a", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Checking access…</span>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    !userFilter ||
    (u.username ?? "").toLowerCase().includes(userFilter.toLowerCase()) ||
    (u.city ?? "").toLowerCase().includes(userFilter.toLowerCase())
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "disputes", label: "Disputes" },
    { key: "fripers", label: "Thrift Stores" },
    { key: "users", label: "Users" },
    { key: "allitems", label: "All Items" },
    { key: "notifications", label: "Notifs" },
    { key: "ads", label: "Ads" },
  ];

  return (
    <div style={{ background: "#1a1a1a", minHeight: "100dvh", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        background: "#111",
        paddingTop: "max(20px, calc(env(safe-area-inset-top, 0px) + 12px))",
        paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Admin</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#FFC543", fontStyle: "italic" }}>TRADE Dashboard</h1>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
          style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 18, padding: "8px 14px", color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", padding: "12px 16px 0", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13,
            background: tab === t.key ? "#FFC543" : "rgba(255,255,255,0.06)",
            color: tab === t.key ? "#2D1A0A" : "rgba(255,255,255,0.5)",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        {loading && <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 32 }}>Loading…</p>}

        {/* TAB 1 — Pending */}
        {tab === "pending" && !loading && (
          pendingItems.length === 0 ? <Empty text="No items pending review ✓" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pendingItems.map(item => (
                <div key={item.id} style={{ background: "#2a2a2a", borderRadius: 20, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: 90, height: 110, flexShrink: 0, background: "#333" }}>
                    {item.image_url && <img src={item.image_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.title ?? "Untitled"}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{[item.brand, item.size, item.condition].filter(Boolean).join(" · ")}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                        @{(item.profiles as { username?: string } | null)?.username ?? "?"} · {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : ""}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => rejectItem(item.id)} style={{ flex: 1, height: 36, borderRadius: 18, border: "1.5px solid #e03c3c", background: "transparent", color: "#e03c3c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✗ Reject</button>
                      <button onClick={() => approveItem(item.id)} style={{ flex: 1, height: 36, borderRadius: 18, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✓ Approve</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 2 — Disputes */}
        {tab === "disputes" && !loading && (
          disputes.length === 0 ? <Empty text="No disputed trades ✓" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {disputes.map(m => (
                <div key={m.id} style={{ background: "#2a2a2a", borderRadius: 20, padding: "16px 16px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{m.id.slice(0, 16)}…</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#e03c3c", background: "rgba(224,60,60,0.15)", borderRadius: 10, padding: "2px 8px" }}>⚠️ Disputed</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#fff" }}>@{m.userA} <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>vs</span> @{m.userB}</p>
                  <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.created_at ? new Date(m.created_at).toLocaleDateString("en-GB") : ""}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => router.push(`/chat/${m.id}`)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>💬 View chat</button>
                    <button onClick={() => cancelTrade(m.id)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "1.5px solid #e03c3c", background: "transparent", color: "#e03c3c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✗ Cancel</button>
                    <button onClick={() => completeDispute(m.id)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓ Mark completed</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 3 — Thrift Stores */}
        {tab === "fripers" && !loading && (
          fripers.length === 0 ? <Empty text="No thrift store accounts yet." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {fripers.map(f => (
                <div key={f.id} style={{ background: "#2a2a2a", borderRadius: 20, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{f.shop_name ?? f.username ?? "?"}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>@{f.username ?? "?"}</p>
                    </div>
                    {f.verified_badge
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: "#5d8f3c", background: "rgba(93,143,60,0.15)", borderRadius: 10, padding: "4px 10px" }}>✓ Verified</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, color: "#FFC543", background: "rgba(255,197,67,0.12)", borderRadius: 10, padding: "4px 10px" }}>⏳ Pending</span>
                    }
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {f.city ? `📍 ${f.city} · ` : ""}{f.item_count ?? 0} items · Member since {f.created_at ? new Date(f.created_at).toLocaleDateString("en-GB") : "?"}
                  </p>
                  <button
                    onClick={() => toggleBadge(f.id, !!f.verified_badge)}
                    style={{ height: 34, padding: "0 16px", borderRadius: 17, border: f.verified_badge ? "1.5px solid rgba(255,255,255,0.2)" : "none", background: f.verified_badge ? "transparent" : "#FFC543", color: f.verified_badge ? "rgba(255,255,255,0.5)" : "#2D1A0A", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    {f.verified_badge ? "Revoke badge" : "Grant badge ✓"}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 4 — Users */}
        {tab === "users" && !loading && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Total: {users.length} users</span>
            </div>
            <input
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              placeholder="Search by username or city…"
              style={{ width: "100%", height: 44, background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "0 18px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
            />
            {filteredUsers.length === 0 ? <Empty text="No users found." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredUsers.map(u => (
                  <div key={u.id} style={{ background: u.banned ? "#2a1a1a" : "#2a2a2a", borderRadius: 16, padding: "12px 16px", border: u.banned ? "1px solid rgba(224,60,60,0.25)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#3a3a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 15 }}>{u.account_type === "friperie" ? "🏪" : "👤"}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: u.banned ? "#e03c3c" : "#fff" }}>
                          @{u.username ?? "—"}
                          {u.banned && <span style={{ fontSize: 10, color: "#e03c3c", marginLeft: 6, fontWeight: 600 }}>🚫 Banned</span>}
                          {u.verified_badge && !u.banned && <span style={{ fontSize: 10, color: "#5d8f3c", marginLeft: 6, fontWeight: 600 }}>✓ Verified</span>}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {u.city ? `${u.city} · ` : ""}{u.item_count ?? 0} items{typeof u.coins_balance === "number" ? ` · ${u.coins_balance} 🪙` : ""} · {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : ""}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => banUser(u.id, !!u.banned)} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: u.banned ? "1.5px solid rgba(255,255,255,0.2)" : "1.5px solid #e03c3c", background: "transparent", color: u.banned ? "rgba(255,255,255,0.45)" : "#e03c3c", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        {u.banned ? "Unban" : "🚫 Ban"}
                      </button>
                      <button onClick={() => verifyUser(u.id, !!u.verified_badge)} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: "none", background: u.verified_badge ? "rgba(93,143,60,0.2)" : "rgba(255,255,255,0.07)", color: u.verified_badge ? "#5d8f3c" : "rgba(255,255,255,0.45)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        {u.verified_badge ? "✓ Verified" : "✓ Verify"}
                      </button>
                      <button onClick={() => loadUserStats(u)} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: "none", background: "rgba(107,33,168,0.25)", color: "#a855f7", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        👑 Stats
                      </button>
                      <button onClick={() => deleteUser(u.id, u.username ?? u.id)} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: "1.5px solid rgba(224,60,60,0.4)", background: "rgba(224,60,60,0.1)", color: "#e03c3c", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 5 — All Items */}
        {tab === "allitems" && !loading && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{allItems.length} items</span>
            </div>
            {allItems.length === 0 ? <Empty text="No items." /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allItems.map(item => {
                  const sc = STATUS_COLOR[item.status ?? ""] ?? "rgba(255,255,255,0.3)";
                  return (
                    <div key={item.id} style={{ background: "#2a2a2a", borderRadius: 20, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: 80, height: 96, flexShrink: 0, background: "#333", position: "relative" }}>
                        {item.image_url && <img src={item.image_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        {item.featured && <div style={{ position: "absolute", top: 4, left: 4, background: "#FFC543", borderRadius: 6, padding: "1px 4px", fontSize: 9, fontWeight: 800, color: "#2D1A0A" }}>⭐</div>}
                      </div>
                      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title ?? "Untitled"}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, color: sc, background: `${sc}22`, borderRadius: 6, padding: "2px 5px", flexShrink: 0 }}>{item.status ?? "?"}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{[item.brand, item.size, item.condition].filter(Boolean).join(" · ")}{item.coins_value ? ` · ${item.coins_value} 🪙` : ""}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.28)" }}>@{(item.profiles as { username?: string } | null)?.username ?? "?"} · {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : ""}</p>
                        </div>
                        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                          {item.status === "pending_review" && (
                            <button onClick={() => approveAllItem(item.id)} style={{ height: 26, padding: "0 9px", borderRadius: 13, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>✓ Approve</button>
                          )}
                          {item.status !== "rejected" && (
                            <button onClick={() => rejectAllItem(item.id)} style={{ height: 26, padding: "0 9px", borderRadius: 13, border: "1.5px solid #e03c3c", background: "transparent", color: "#e03c3c", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>✗ Reject</button>
                          )}
                          <button onClick={() => featureItem(item.id, !!item.featured)} style={{ height: 26, padding: "0 9px", borderRadius: 13, border: "none", background: item.featured ? "rgba(255,197,67,0.25)" : "rgba(255,255,255,0.06)", color: item.featured ? "#FFC543" : "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
                            {item.featured ? "⭐ Featured" : "⭐ Feature"}
                          </button>
                          <button onClick={() => { if (window.confirm("Delete this item permanently?")) deleteItem(item.id); }} style={{ height: 26, padding: "0 9px", borderRadius: 13, border: "none", background: "rgba(224,60,60,0.12)", color: "#e03c3c", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>🗑 Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 6 — Notifications */}
        {tab === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#2a2a2a", borderRadius: 20, padding: 20 }}>
              <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#fff" }}>Send to all users</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
                  "🎉 New feature just dropped — check it out!",
                  "👕 New items just added near you!",
                  "🔄 Someone wants to trade with you — check your matches!",
                ].map(preset => (
                  <button key={preset} onClick={() => setNotifMsg(preset)} style={{ textAlign: "left", padding: "10px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: 13, cursor: "pointer", lineHeight: 1.4 }}>
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                value={notifMsg}
                onChange={e => setNotifMsg(e.target.value)}
                placeholder="Or type a custom message…"
                rows={3}
                style={{ width: "100%", background: "#333", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: "#fff", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: FONT }}
              />
              <button
                onClick={sendNotification}
                disabled={notifSending || !notifMsg.trim()}
                style={{ width: "100%", height: 48, borderRadius: 24, border: "none", background: notifMsg.trim() ? "#FFC543" : "rgba(255,255,255,0.08)", color: notifMsg.trim() ? "#2D1A0A" : "rgba(255,255,255,0.25)", fontWeight: 800, fontSize: 15, cursor: notifMsg.trim() ? "pointer" : "not-allowed" }}
              >
                {notifSending ? "Sending…" : "📣 Send to all users"}
              </button>
              {notifSentCount !== null && (
                <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#5d8f3c" }}>✓ Notification sent to {notifSentCount} users</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7 — Ads */}
        {tab === "ads" && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <button onClick={() => setShowAddAd(v => !v)} style={{ height: 44, borderRadius: 22, border: "1.5px solid rgba(255,197,67,0.4)", background: "transparent", color: "#FFC543", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {showAddAd ? "✕ Cancel" : "+ Add new ad"}
            </button>
            {showAddAd && (
              <div style={{ background: "#2a2a2a", borderRadius: 20, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#fff" }}>New Ad</p>
                {([
                  { label: "Advertiser name *", key: "advertiser_name", placeholder: "e.g. Zara Belgium" },
                  { label: "Image URL *", key: "image_url", placeholder: "https://…" },
                  { label: "Link URL", key: "link_url", placeholder: "https://…" },
                  { label: "CTA text", key: "cta_text", placeholder: "e.g. Shop now" },
                ] as const).map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{label}</label>
                    <input value={newAd[key]} onChange={e => setNewAd(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", height: 40, background: "#333", border: "none", borderRadius: 12, padding: "0 12px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <button onClick={addAd} disabled={addingAd || !newAd.advertiser_name || !newAd.image_url} style={{ marginTop: 4, height: 44, borderRadius: 22, border: "none", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  {addingAd ? "Adding…" : "Add Ad"}
                </button>
              </div>
            )}
            {ads.length === 0 ? <Empty text="No ads yet." /> : (
              ads.map(ad => (
                <div key={ad.id} style={{ background: "#2a2a2a", borderRadius: 20, overflow: "hidden", display: "flex" }}>
                  <div style={{ width: 80, height: 80, flexShrink: 0, background: "#333" }}>
                    {ad.image_url && <img src={ad.image_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#fff" }}>{ad.advertiser_name ?? "—"}</p>
                      {ad.link_url && <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.link_url}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => toggleAd(ad.id, !!ad.active)} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: "none", background: ad.active ? "rgba(93,143,60,0.2)" : "rgba(255,255,255,0.06)", color: ad.active ? "#5d8f3c" : "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        {ad.active ? "● Active" : "○ Inactive"}
                      </button>
                      <button onClick={() => { if (window.confirm("Delete this ad?")) deleteAd(ad.id); }} style={{ height: 28, padding: "0 12px", borderRadius: 14, border: "none", background: "rgba(224,60,60,0.12)", color: "#e03c3c", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>🗑 Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* User Stats Modal */}
      {userStatsTarget && (
        <div onClick={() => { setUserStatsTarget(null); setUserStats(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#2a2a2a", borderRadius: 24, padding: 24, width: "100%", maxWidth: 340 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff" }}>@{userStatsTarget.username ?? "?"}</p>
              <button onClick={() => { setUserStatsTarget(null); setUserStats(null); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 20, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
            {loadingUserStats ? (
              <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "20px 0" }}>Loading…</p>
            ) : userStats ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Items posted", value: String(userStats.itemCount) },
                  { label: "Trades done", value: String(userStats.tradeCount) },
                  { label: "Coins", value: String(userStatsTarget.coins_balance ?? 0) },
                  { label: "Avg rating", value: userStats.avgRating },
                  { label: "Member since", value: userStatsTarget.created_at ? String(new Date(userStatsTarget.created_at).getFullYear()) : "?" },
                  { label: "City", value: userStatsTarget.city ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#333", borderRadius: 14, padding: "12px 14px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFC543" }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", marginTop: 48, padding: "0 24px" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: 600 }}>{text}</p>
    </div>
  );
}
