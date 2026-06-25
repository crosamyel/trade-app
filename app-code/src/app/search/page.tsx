"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProposalSheet } from "@/app/home/page";
import { HeaderActions } from "@/components/HeaderActions";
import type { CardData } from "@/components/SwipeCard";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Clothing = {
  id: string | number;
  user_id: string;
  image_url?: string;
  title?: string;
  brand?: string;
  category?: string;
  style?: string;
  size?: string;
  condition?: string;
  price_coins?: number;
  profiles?: { username?: string; avatar_url?: string } | null;
};

type UserProfile = {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  city?: string;
  account_type?: string;
  shop_name?: string;
};

export default function SearchPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<string | null>(null);
  const [myItems, setMyItems] = useState<Clothing[]>([]);
  const [myCoins, setMyCoins] = useState(0);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState(0); // 0 = any

  const [results, setResults] = useState<Clothing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<"items" | "people">("items");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [detail, setDetail] = useState<Clothing | null>(null);
  const [proposingFor, setProposingFor] = useState<Clothing | null>(null);
  const [toast, setToast] = useState("");

  // Reads filters chosen on /search/filters (passed via the URL)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCategory(p.get("category") ?? "");
    setStyle(p.get("style") ?? "");
    setColor(p.get("color") ?? "");
    setSize(p.get("size") ?? "");
    setCondition(p.get("condition") ?? "");
    setPrice(Number(p.get("price") ?? 0));
  }, []);

  function openFilters() {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (style) p.set("style", style);
    if (color) p.set("color", color);
    if (size) p.set("size", size);
    if (condition) p.set("condition", condition);
    if (price > 0) p.set("price", String(price));
    router.push(`/search/filters?${p.toString()}`);
  }

  const activeFilters = [
    category ? { label: category, clear: () => setCategory("") } : null,
    style ? { label: style, clear: () => setStyle("") } : null,
    color ? { label: color, clear: () => setColor("") } : null,
    size ? { label: size, clear: () => setSize("") } : null,
    condition ? { label: condition, clear: () => setCondition("") } : null,
    price > 0 ? { label: `≤ ${price} coins`, clear: () => setPrice(0) } : null,
  ].filter(Boolean) as { label: string; clear: () => void }[];

  // Auth + mes données (pour proposer) + focus auto
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      const { data: mine } = await supabase
        .from("clothing").select("*").eq("user_id", user.id).eq("status", "active");
      setMyItems((mine as Clothing[]) ?? []);

      try {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (typeof prof?.coins_balance === "number") setMyCoins(prof.coins_balance);
      } catch { /* profiles indisponible */ }
    }
    init();
    searchRef.current?.focus();
  }, [router]);

  // Recherche temps réel avec debounce 400ms
  useEffect(() => {
    if (!me) return;
    setLoading(true);
    const t = setTimeout(async () => {
      // Construction conditionnelle de la query
      function build(withJoin: boolean) {
        let q = supabase
          .from("clothing")
          .select(withJoin ? "*, profiles(username, avatar_url)" : "*")
          .neq("user_id", me)
          .eq("status", "active");
        if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
        if (category && category !== "All") q = q.eq("category", category);
        if (style) q = q.eq("style", style);
        if (color) q = q.ilike("color", `%${color}%`);
        if (size) q = q.eq("size", size);
        if (condition) q = q.eq("condition", condition);
        if (price > 0) q = q.lte("price_coins", price);
        return q.order("created_at", { ascending: false }).limit(30);
      }

      let res = await build(true);
      if (res.error) res = await build(false); // fallback si la relation profiles n'existe pas
      setResults((res.data as unknown as Clothing[]) ?? []);
      setLoading(false);
    }, 400);

    return () => clearTimeout(t);
  }, [search, category, style, color, size, condition, price, me]);

  // Recherche de profils (mode "people")
  useEffect(() => {
    if (!me || searchMode !== "people") return;
    setUsersLoading(true);
    const t = setTimeout(async () => {
      let q = supabase.from("profiles").select("id, username, avatar_url, city, account_type, shop_name").neq("id", me);
      if (search.trim()) q = q.ilike("username", `%${search.trim()}%`);
      const { data } = await q.order("username").limit(30);
      setUserResults((data as UserProfile[]) ?? []);
      setUsersLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search, me, searchMode]);

  function toCard(it: Clothing): CardData {
    return {
      id: String(it.id), photo: it.image_url ?? "/card-photo-01.png",
      title: it.title ?? "Item", location: "Brussels",
      username: it.profiles?.username ?? "user", views: 0,
      distance: "?km", size: it.size ?? "?", condition: it.condition ?? "Good",
    };
  }

  // Envoi de proposition depuis la recherche (like + match)
  async function sendProposal(myItem: Clothing, offeredCoins: number) {
    const item = proposingFor;
    setProposingFor(null);
    setDetail(null);
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
        return;
      }
      setToast("Proposal sent ✓");
      setTimeout(() => setToast(""), 2500);
    } catch (e) {
      console.error("proposal error:", e);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header standard (comme les autres pages) */}
      <div style={{
        position: "relative", background: "#3c2f22",
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

      {/* Titre "Explore" centré + icône filtres à gauche */}
      <div style={{ position: "relative", height: 44, marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {searchMode === "items" && (
          <button
            onClick={openFilters}
            style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 14, background: activeFilters.length > 0 ? "#FFC543" : "#E8E4DC", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Filters"
          >
            <FilterIcon />
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>Explore</h1>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{
          height: 50, background: "#F9F4E8", border: "1.5px solid #D8D0BE", borderRadius: 25,
          display: "flex", alignItems: "center", gap: 10, padding: "0 18px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.07)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#9b8f7a" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="#9b8f7a" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchMode === "people" ? "Search a username…" : "Search clothes..."}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#2D1A0A", fontSize: 15 }}
          />
        </div>
      </div>

      {/* Tabs Items / People */}
      <div style={{ display: "flex", margin: "14px 18px 0", background: "#EDE8DC", borderRadius: 22, padding: 3, gap: 0 }}>
        {(["items", "people"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            style={{ flex: 1, height: 38, borderRadius: 19, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: searchMode === mode ? "#3c2f22" : "transparent", color: searchMode === mode ? "#FFC543" : "#9b8f7a", transition: "background 0.15s, color 0.15s" }}
          >
            {mode === "items" ? "Items" : "People"}
          </button>
        ))}
      </div>

      {/* Filtres actifs (sélectionnés sur /search/filters) */}
      {searchMode === "items" && activeFilters.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "14px 18px 0" }}>
          {activeFilters.map((f, i) => (
            <button
              key={i}
              onClick={f.clear}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 16, border: "none", background: "#FFC543", color: "#2D1A0A", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
            >
              {f.label}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#2D1A0A" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
          ))}
        </div>
      )}

      {/* Résultats */}
      <div style={{ padding: "14px 16px 120px" }}>
        {searchMode === "items" ? (
          loading ? (
            <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 30, fontWeight: 600 }}>Searching…</p>
          ) : results.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 50 }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>🧥</div>
              <p style={{ color: "#2D1A0A", opacity: 0.6, fontSize: 15 }}>No clothes found,<br />try different filters</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {results.map((it) => <ResultCard key={String(it.id)} item={it} onClick={() => router.push(`/detail/${it.id}`)} />)}
            </div>
          )
        ) : (
          usersLoading ? (
            <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.5, marginTop: 30, fontWeight: 600 }}>Searching…</p>
          ) : userResults.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 50 }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>👤</div>
              <p style={{ color: "#2D1A0A", opacity: 0.6, fontSize: 15 }}>{search.trim() ? "No profile found" : "Search for a username"}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {userResults.map((u) => <ProfileCard key={u.id} user={u} onClick={() => router.push(`/shop/${u.id}`)} />)}
            </div>
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "#2D1A0A", color: "#FFC543", fontWeight: 700, fontSize: 14, padding: "10px 18px", borderRadius: 22, zIndex: 95 }}>{toast}</div>
      )}

      {/* Détail (overlay) */}
      {detail && (
        <DetailOverlay item={detail} onClose={() => setDetail(null)} onTrade={() => setProposingFor(detail)} />
      )}

      {/* Feuille de proposition */}
      {proposingFor && (
        <ProposalSheet
          target={proposingFor as never}
          myItems={myItems as never}
          available={myCoins}
          toCard={toCard as never}
          onCancel={() => setProposingFor(null)}
          onSend={sendProposal as never}
          onAddItem={() => router.push("/upload")}
        />
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M7 12h10M10 17h4" stroke="#2D1A0A" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/* ===== Carte résultat ===== */
function condStyle(condition?: string): { label: string; bg: string } {
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

function ResultCard({ item, onClick }: { item: Clothing; onClick: () => void }) {
  const cond = condStyle(item.condition);
  return (
    <button onClick={onClick} style={{ textAlign: "left", padding: 0, border: "none", background: "#F9F4E8", borderRadius: 20, overflow: "hidden", cursor: "pointer", boxShadow: "0 3px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", background: "#ece6d8" }}>
        {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <span style={{ position: "absolute", top: 8, left: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: cond.bg, borderRadius: 20, padding: "3px 9px" }}>{cond.label}</span>
      </div>
      <div style={{ padding: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#2D1A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title ?? "Item"}</p>
        <p style={{ margin: "1px 0 0", fontSize: 12, color: "#9b8f7a" }}>{item.brand ?? "—"}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
          <span style={{ fontSize: 12, color: "#2D1A0A", fontWeight: 600 }}>{item.size ?? "?"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, fontWeight: 800, color: "#2D1A0A" }}>
            {item.price_coins ?? 20}
            <span style={{ position: "relative", display: "inline-block", width: 14, height: 14 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#2D1A0A" }}>
            {(item.profiles?.username?.[0] ?? "?").toUpperCase()}
          </div>
          <span style={{ fontSize: 11, color: "#9b8f7a" }}>@{item.profiles?.username ?? "user"}</span>
        </div>
      </div>
    </button>
  );
}

/* ===== Profile Card ===== */
function ProfileCard({ user, onClick }: { user: UserProfile; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", border: "none", background: "#F9F4E8",
        borderRadius: 20, cursor: "pointer", width: "100%", textAlign: "left",
        boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{
        width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
        background: "#FFC543", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, fontWeight: 800, color: "#2D1A0A",
      }}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : (user.username?.[0] ?? "?").toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#2D1A0A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.full_name || user.username || "User"}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9b8f7a" }}>@{user.username ?? "user"}</p>
        {user.account_type === "shop" && (
          <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, color: "#fff", background: "#3c2f22", borderRadius: 20, padding: "2px 8px" }}>
            ✓ Thrift Store
          </span>
        )}
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
        <path d="M9 18l6-6-6-6" stroke="#2D1A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ===== Overlay détail ===== */
function DetailOverlay({ item, onClose, onTrade }: { item: Clothing; onClose: () => void; onTrade: () => void }) {
  const cond = condStyle(item.condition);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,12,4,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#F9F4E8", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", maxHeight: "88dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "#ece6d8", flexShrink: 0 }}>
          {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
          <span style={{ position: "absolute", top: 12, left: 12, fontSize: 12, fontWeight: 700, color: "#fff", background: cond.bg, borderRadius: 20, padding: "4px 11px" }}>{cond.label}</span>
        </div>
        <div style={{ padding: "18px 20px 22px", overflowY: "auto" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#2D1A0A" }}>{item.title ?? "Item"}</h2>
          <p style={{ margin: "4px 0 14px", fontSize: 14, color: "#9b8f7a" }}>{item.brand ?? "—"} · size {item.size ?? "?"}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#2D1A0A" }}>{item.price_coins ?? 20}</span>
            <span style={{ position: "relative", display: "inline-block", width: 22, height: 22 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#9b8f7a" }}>@{item.profiles?.username ?? "user"}</span>
          </div>
          <button onClick={onTrade} style={{ width: "100%", height: 54, borderRadius: 27, border: "none", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 17, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,197,67,0.45)" }}>
            Trade
          </button>
        </div>
      </div>
    </div>
  );
}
