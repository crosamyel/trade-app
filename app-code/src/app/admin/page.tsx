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
  id: string; username?: string; account_type?: string; city?: string;
  created_at?: string; item_count?: number;
};

type Tab = "pending" | "disputes" | "fripers" | "users";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [disputes, setDisputes] = useState<DisputedMatch[]>([]);
  const [fripers, setFripers] = useState<FriperieProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [loading, setLoading] = useState(false);

  // Access check
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
    const { data } = await supabase.from("profiles")
      .select("id, username, account_type, city, created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (!data) { setLoading(false); return; }
    const ids = data.map(p => p.id);
    const itemCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: c } = await supabase.from("clothing").select("user_id").in("user_id", ids);
      for (const r of c ?? []) itemCounts[r.user_id] = (itemCounts[r.user_id] ?? 0) + 1;
    }
    setUsers(data.map(p => ({ ...p, item_count: itemCounts[p.id] ?? 0 })) as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    if (tab === "pending") loadPending();
    else if (tab === "disputes") loadDisputes();
    else if (tab === "fripers") loadFripers();
    else if (tab === "users") loadUsers();
  }, [authorized, tab, loadPending, loadDisputes, loadFripers, loadUsers]);

  async function approveItem(id: string) {
    await supabase.from("clothing").update({ status: "active" }).eq("id", id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  }
  async function rejectItem(id: string) {
    await supabase.from("clothing").update({ status: "rejected" }).eq("id", id);
    setPendingItems(prev => prev.filter(i => i.id !== id));
  }
  async function completeDispute(matchId: string) {
    await supabase.from("matches").update({ trade_status: "completed", status: "completed" }).eq("id", matchId);
    setDisputes(prev => prev.filter(m => m.id !== matchId));
  }
  async function cancelTrade(matchId: string) {
    await supabase.from("matches").update({ trade_status: "cancelled" }).eq("id", matchId);
    setDisputes(prev => prev.filter(m => m.id !== matchId));
  }
  async function toggleBadge(profileId: string, current: boolean) {
    await supabase.from("profiles").update({ verified_badge: !current }).eq("id", profileId);
    setFripers(prev => prev.map(f => f.id === profileId ? { ...f, verified_badge: !current } : f));
  }

  if (authorized === null) {
    return (
      <div style={{ background: "#1a1a1a", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Checking access…</span>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    !userFilter || (u.username ?? "").toLowerCase().includes(userFilter.toLowerCase())
  );

  const TABS: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "disputes", label: "Disputes" },
    { key: "fripers", label: "Thrift Stores" },
    { key: "users", label: "Users" },
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
      <div style={{ display: "flex", padding: "12px 16px 0", gap: 8, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13,
              background: tab === t.key ? "#FFC543" : "rgba(255,255,255,0.06)",
              color: tab === t.key ? "#2D1A0A" : "rgba(255,255,255,0.5)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        {loading && (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 32 }}>Loading…</p>
        )}

        {/* TAB 1 — Pending review */}
        {tab === "pending" && !loading && (
          <>
            {pendingItems.length === 0 ? (
              <Empty text="No items pending review ✓" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pendingItems.map(item => (
                  <div key={item.id} style={{ background: "#2a2a2a", borderRadius: 20, overflow: "hidden", display: "flex", gap: 0 }}>
                    <div style={{ width: 90, height: 110, flexShrink: 0, background: "#333" }}>
                      {item.image_url && <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.title ?? "Untitled"}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                          {[item.brand, item.size, item.condition].filter(Boolean).join(" · ")}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          @{(item.profiles as { username?: string } | null)?.username ?? "?"} · {item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => rejectItem(item.id)} style={{ flex: 1, height: 36, borderRadius: 18, border: "1.5px solid #e03c3c", background: "transparent", color: "#e03c3c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          ✗ Reject
                        </button>
                        <button onClick={() => approveItem(item.id)} style={{ flex: 1, height: 36, borderRadius: 18, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          ✓ Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2 — Disputes */}
        {tab === "disputes" && !loading && (
          <>
            {disputes.length === 0 ? (
              <Empty text="No disputed trades ✓" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {disputes.map(m => (
                  <div key={m.id} style={{ background: "#2a2a2a", borderRadius: 20, padding: "16px 16px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{m.id.slice(0, 16)}…</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#e03c3c", background: "rgba(224,60,60,0.15)", borderRadius: 10, padding: "2px 8px" }}>⚠️ Disputed</span>
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                      @{m.userA} <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>vs</span> @{m.userB}
                    </p>
                    <p style={{ margin: "0 0 12px", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{m.created_at ? new Date(m.created_at).toLocaleDateString("en-GB") : ""}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => router.push(`/chat/${m.id}`)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "1.5px solid rgba(255,255,255,0.2)", background: "transparent", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        💬 View chat
                      </button>
                      <button onClick={() => cancelTrade(m.id)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "1.5px solid #e03c3c", background: "transparent", color: "#e03c3c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ✗ Cancel trade
                      </button>
                      <button onClick={() => completeDispute(m.id)} style={{ height: 34, padding: "0 14px", borderRadius: 17, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        ✓ Mark completed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 3 — Thrift Store Verification */}
        {tab === "fripers" && !loading && (
          <>
            {fripers.length === 0 ? (
              <Empty text="No thrift store accounts yet." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {fripers.map(f => (
                  <div key={f.id} style={{ background: "#2a2a2a", borderRadius: 20, padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{f.shop_name ?? f.username ?? "?"}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>@{f.username ?? "?"}</p>
                      </div>
                      {f.verified_badge ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#5d8f3c", background: "rgba(93,143,60,0.15)", borderRadius: 10, padding: "4px 10px" }}>✓ Verified</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#FFC543", background: "rgba(255,197,67,0.12)", borderRadius: 10, padding: "4px 10px" }}>⏳ Pending</span>
                      )}
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
            )}
          </>
        )}

        {/* TAB 4 — Users */}
        {tab === "users" && !loading && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Total users: {users.length}</span>
            </div>
            <input
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              placeholder="Search by username…"
              style={{ width: "100%", height: 44, background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 22, padding: "0 18px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
            />
            {filteredUsers.length === 0 ? (
              <Empty text="No users found." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredUsers.map(u => (
                  <div key={u.id} style={{ background: "#2a2a2a", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#3a3a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 16 }}>{u.account_type === "friperie" ? "🏪" : "👤"}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>@{u.username ?? "—"}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                        {u.city ? `${u.city} · ` : ""}{u.item_count ?? 0} items · {u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : ""}
                      </p>
                    </div>
                    {u.account_type === "friperie" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#FFC543", background: "rgba(255,197,67,0.12)", borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>Thrift</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
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
