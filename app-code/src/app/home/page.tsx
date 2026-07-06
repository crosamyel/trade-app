"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SwipeCard, CardData } from "@/components/SwipeCard";
import { HeaderActions } from "@/components/HeaderActions";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/lib/usePushNotifications";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Clothing = {
  id: string | number;
  user_id: string;
  image_url?: string;
  image_back_url?: string;
  image_label_url?: string;
  image_detail_url?: string;
  title?: string;
  location?: string;
  size?: string;
  style?: string;
  condition?: string;
  coins_value?: number;
  views?: number;
  distance?: number;
  featured?: boolean;
  profiles?: { username?: string; avatar_url?: string; city?: string } | null;
};

function getPhotos(item: Clothing): string[] {
  const urls = [item.image_url, item.image_back_url, item.image_label_url, item.image_detail_url]
    .filter((u): u is string => !!u);
  return urls.length > 0 ? urls : ["/card-photo-01.png"];
}

type MatchInfo = { myPhoto: string; theirPhoto: string; theirUserId: string };

type Ad = {
  id: string;
  advertiser_name?: string;
  image_url?: string;
  link_url?: string;
  cta_text?: string;
  isAd: true;
};

// Client-side relevance scorer — higher = shown first
function scoreClothing(item: Clothing, myCity: string, prefStyles: string[], prefSizes: string[], myAvgCoins: number): number {
  let score = 0;
  if (item.featured) score += 1000;
  if (item.profiles?.city && myCity && item.profiles.city.toLowerCase() === myCity.toLowerCase()) score += 30;
  if (prefStyles.length > 0 && item.style && prefStyles.some(s => item.style!.toLowerCase().includes(s.toLowerCase()))) score += 25;
  if (prefSizes.length > 0 && item.size && prefSizes.some(s => item.size!.toUpperCase() === s.toUpperCase())) score += 20;
  const coins = item.coins_value ?? 0;
  const diff = Math.abs(coins - myAvgCoins);
  if (diff <= myAvgCoins * 0.3) score += 15;
  else if (diff <= myAvgCoins * 0.6) score += 8;
  score += Math.random() * 5;
  return score;
}

async function notifyUser(userId: string | null | undefined, type: string, body: string, link: string, title?: string) {
  if (!userId) return;
  // 1. Notification in-app (Supabase)
  try {
    await supabase.from("notifications").insert({ user_id: userId, type, body, read: false, link });
  } catch { /* notifications table may not exist yet */ }
  // 2. Push browser
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: title ?? "TRADE", body, url: link }),
    });
  } catch { /* push optional */ }
}

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // Enregistrement push notifications (demande permission après 3s)
  usePushNotifications(currentUser?.id);
  const [isBanned, setIsBanned] = useState(false);
  const [stack, setStack] = useState<Clothing[]>([]);
  const [myItems, setMyItems] = useState<Clothing[]>([]);
  const [myCoins, setMyCoins] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeAds, setActiveAds] = useState<Ad[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMoreRef = useRef(true);
  const feedOffsetRef = useRef(0);
  const currentUserRef = useRef<{ id: string } | null>(null);
  const prefsRef = useRef({ sizes: [] as string[], styles: [] as string[], minCoins: 0, city: "", avgCoins: 50 });
  const likedIdsRef = useRef<string[]>([]);

  // Feuille "choisir mon vêtement à proposer" (Mode B — troc)
  const [proposingFor, setProposingFor] = useState<Clothing | null>(null);

  // Geste de swipe
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);

  // Match
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchData, setMatchData] = useState<MatchInfo | null>(null);

  // Auth + chargement de la pile de vêtements
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setCurrentUser({ id: user.id });
      currentUserRef.current = { id: user.id };

      // Prefs + coins depuis profiles
      let pref_sizes: string[] = [];
      let pref_styles: string[] = [];
      let pref_min_coins = 0;
      let myCity = "";
      try {
        const { data: prof } = await supabase
          .from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (prof?.banned) { setIsBanned(true); setLoading(false); return; }
        if (typeof prof?.coins_balance === "number") setMyCoins(prof.coins_balance);
        if (Array.isArray(prof?.pref_sizes)) pref_sizes = prof.pref_sizes;
        if (Array.isArray(prof?.pref_styles)) pref_styles = prof.pref_styles;
        if (typeof prof?.pref_min_coins === "number") pref_min_coins = prof.pref_min_coins;
        if (typeof prof?.city === "string") myCity = prof.city;
      } catch { /* profiles indisponible */ }

      // Liked items to exclude from feed — capped at 200 to stay under PostgREST URL limit
      let likedIds: string[] = [];
      try {
        const { data: likedRows } = await supabase.from("likes").select("clothing_id").eq("user_id", user.id);
        likedIds = (likedRows ?? []).slice(-200).map((r: { clothing_id: string }) => String(r.clothing_id));
      } catch { /* likes table may not exist */ }
      likedIdsRef.current = likedIds;

      // Own items — used for proposal sheet + myAvgCoins
      const { data: mine } = await supabase
        .from("clothing").select("*").eq("user_id", user.id).eq("status", "active");
      setMyItems((mine as Clothing[]) ?? []);
      const myAvgCoins = mine && mine.length > 0
        ? mine.reduce((s: number, i: { coins_value?: number }) => s + (i.coins_value ?? 0), 0) / mine.length
        : 50;

      prefsRef.current = { sizes: pref_sizes, styles: pref_styles, minCoins: pref_min_coins, city: myCity, avgCoins: myAvgCoins };
      feedOffsetRef.current = 0;
      hasMoreRef.current = true;

      const COLS = "id, user_id, image_url, image_back_url, image_label_url, image_detail_url, title, size, style, condition, coins_value, location, profiles(username, avatar_url, city)";
      const COLS_NOJOIN = "id, user_id, image_url, image_back_url, image_label_url, image_detail_url, title, size, style, condition, coins_value, location";

      const userId = user.id;
      async function fetchClothing(withLikedFilter: boolean): Promise<Clothing[] | null> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = supabase
          .from("clothing").select(COLS)
          .neq("user_id", userId).eq("status", "active")
          .range(0, 99);
        if (pref_min_coins > 0) q = q.gte("coins_value", pref_min_coins);
        if (withLikedFilter && likedIds.length > 0) q = q.not("id", "in", `(${likedIds.join(",")})`);

        const joined = await q;
        if (!joined.error) return (joined.data as Clothing[]) ?? null;

        console.warn("[home] profiles join failed, fallback sans profiles:", joined.error.message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q2: any = supabase
          .from("clothing").select(COLS_NOJOIN)
          .neq("user_id", userId).eq("status", "active")
          .range(0, 99);
        if (pref_min_coins > 0) q2 = q2.gte("coins_value", pref_min_coins);
        if (withLikedFilter && likedIds.length > 0) q2 = q2.not("id", "in", `(${likedIds.join(",")})`);
        const plain = await q2;
        return (plain.data as Clothing[]) ?? null;
      }

      let clothes = await fetchClothing(true);
      // Fallback : si 0 résultats avec le filtre liked, on réessaie sans pour éviter un feed vide
      if ((!clothes || clothes.length === 0) && likedIds.length > 0) {
        console.warn("[home] Feed vide avec filtre liked, retry sans filtre");
        clothes = await fetchClothing(false);
      }

      // Score, sort, then filter already-swiped this session (clé par user pour éviter cross-contamination)
      const seenKey = `trade_seen_ids_${userId}`;
      const seenStr = typeof window !== "undefined" ? sessionStorage.getItem(seenKey) ?? "" : "";
      const sessionSeen = new Set(seenStr.split(",").filter(Boolean));
      const sortedItems = [...(clothes ?? [])]
        .sort((a, b) => scoreClothing(b, myCity, pref_styles, pref_sizes, myAvgCoins) - scoreClothing(a, myCity, pref_styles, pref_sizes, myAvgCoins))
        .filter(c => !sessionSeen.has(String(c.id)));
      setStack(sortedItems);

      // Load active ads (inactive by default, no ads shown until activated)
      try {
        const { data: ads } = await supabase.from("ads").select("*").eq("active", true).limit(10);
        if (ads && ads.length > 0) setActiveAds((ads as Ad[]).map(a => ({ ...a, isAd: true as const })));
      } catch { /* ads table may not exist yet */ }

      setLoading(false);
    }
    const timeout = setTimeout(() => {
      setLoading(prev => { if (prev) setLoadError(true); return false; });
    }, 12000);
    init().finally(() => clearTimeout(timeout));
  }, [router]);

  // Auto-charge 10 items de plus quand il reste ≤ 3 cartes
  useEffect(() => {
    if (!currentUser || loadingMore || !hasMoreRef.current || loading) return;
    if (stack.length > 0 && currentIndex >= stack.length - 3) loadMoreClothing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, stack.length]);

  async function loadMoreClothing() {
    if (!currentUserRef.current || loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    const newOffset = feedOffsetRef.current + 100;
    const { sizes, styles, minCoins, city, avgCoins } = prefsRef.current;
    const likedIds = likedIdsRef.current;
    const COLS = "id, user_id, image_url, image_back_url, image_label_url, image_detail_url, title, size, style, condition, coins_value, location, profiles(username, avatar_url, city)";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("clothing").select(COLS)
      .neq("user_id", currentUserRef.current.id)
      .eq("status", "active")
      .range(newOffset, newOffset + 99);
    if (minCoins > 0) q = q.gte("coins_value", minCoins);
    if (likedIds.length > 0) q = q.not("id", "in", `(${likedIds.join(",")})`);
    let { data } = await q;
    // Fallback sans filtre liked si 0 résultats
    if ((!data || data.length === 0) && likedIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qFallback: any = supabase
        .from("clothing").select(COLS)
        .neq("user_id", currentUserRef.current.id)
        .eq("status", "active")
        .range(newOffset, newOffset + 99);
      if (minCoins > 0) qFallback = qFallback.gte("coins_value", minCoins);
      const fallback = await qFallback;
      data = fallback.data;
    }
    if (!data || data.length === 0) { hasMoreRef.current = false; setLoadingMore(false); return; }
    const seenKey = `trade_seen_ids_${currentUserRef.current!.id}`;
    const seenStr = sessionStorage.getItem(seenKey) ?? "";
    const seenIds = new Set(seenStr.split(",").filter(Boolean));
    const sorted = [...(data as Clothing[])]
      .sort((a, b) => scoreClothing(b, city, styles, sizes, avgCoins) - scoreClothing(a, city, styles, sizes, avgCoins))
      .filter(c => !seenIds.has(String(c.id)));
    if (sorted.length > 0) setStack(prev => [...prev, ...sorted]);
    feedOffsetRef.current = newOffset;
    setLoadingMore(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function getCard(idx: number): Clothing | Ad | null {
    if (idx > 0 && idx % 10 === 0 && activeAds.length > 0) {
      return activeAds[Math.floor(idx / 10) % activeAds.length];
    }
    return stack[idx] ?? null;
  }

  const current = getCard(currentIndex);
  const isCurrentAd = current !== null && "isAd" in current && (current as Ad).isAd === true;

  function toCard(item: Clothing): CardData {
    const photos = getPhotos(item);
    return {
      id: String(item.id),
      photo: photos[photoIdx] ?? photos[0] ?? "/card-photo-01.png",
      photoCount: photos.length,
      photoIdx: photoIdx,
      title: item.title ?? "Item",
      location: item.location ?? "Brussels",
      username: item.profiles?.username ?? "user",
      views: item.views ?? 0,
      distance: item.distance ? `${item.distance}km` : "?km",
      size: item.size ?? "?",
      condition: item.condition ?? "Good",
    };
  }

  function advance() {
    // Marquer l'item courant comme vu (clé par user)
    if (current && !isCurrentAd && currentUser) {
      const seenKey = `trade_seen_ids_${currentUser.id}`;
      const seenStr = sessionStorage.getItem(seenKey) ?? "";
      const seenIds = new Set(seenStr.split(",").filter(Boolean));
      seenIds.add(String((current as Clothing).id));
      sessionStorage.setItem(seenKey, [...seenIds].join(","));
    }
    setExitDir(null);
    setDragX(0); dragXRef.current = 0;
    setSaved(false);
    setPhotoIdx(0);
    setCurrentIndex((i) => i + 1);
  }

  // Envoi de la proposition : enregistre le like (item proposé + coins) + vérifie le match
  async function sendProposal(myItem: Clothing, offeredCoins: number) {
    const item = proposingFor;
    setProposingFor(null);
    if (!item || !currentUser) return;

    setExitDir("right"); // la carte sort vers la droite
    try {
      await supabase.from("likes").insert({
        user_id: currentUser.id,
        clothing_id: item.id,               // l'item que je veux
        offered_clothing_id: myItem.id,     // l'item que je propose
        // complément coins seulement si > 0 (évite l'erreur si la colonne n'existe pas encore)
        ...(offeredCoins > 0 ? { offered_coins: offeredCoins } : {}),
      });

      // Le proprio de cet item a-t-il déjà liké un de MES vêtements ?
      const { data: matchCheck } = await supabase
        .from("likes")
        .select("clothing_id, clothing!inner(user_id)")
        .eq("clothing.user_id", currentUser.id)
        .eq("user_id", item.user_id);

      if (matchCheck && matchCheck.length > 0) {
        await supabase.from("matches").insert({
          user_a_uid: currentUser.id,
          user_b_uid: item.user_id,
          clothing_a_id: matchCheck[0].clothing_id,
          clothing_b_id: item.id,
        });
        // Notif match pour les deux utilisateurs
        await notifyUser(
          item.user_id,
          "match",
          `Someone wants to trade with you — go check your matches!`,
          "/matches",
          "🎉 New match on TRADE!"
        );
        await notifyUser(
          currentUser.id,
          "match",
          `Your proposal was matched! Check your messages to start the trade.`,
          "/matches",
          "🎉 New match on TRADE!"
        );
        setMatchData({
          myPhoto: myItem.image_url ?? "/card-photo-01.png",
          theirPhoto: item.image_url ?? "/card-photo-01.png",
          theirUserId: item.user_id,
        });
        setShowMatchPopup(true);
      } else {
        // Pas de match (encore) — notif "like reçu" pour le proprio de l'item
        await notifyUser(
          item.user_id,
          "like",
          `Someone likes your ${item.title ?? "item"} and wants to trade!`,
          "/matches",
          "❤️ New like on TRADE"
        );
      }
    } catch (e) {
      console.error("like/match error:", e);
    }
    setTimeout(advance, 300);
  }

  // Décision : skip = sortie gauche + suivant ; like = ouvre la feuille de proposition
  function decide(dir: "left" | "right") {
    if (exitDir || proposingFor || !current) return;
    if (isCurrentAd) {
      // Ad card: any swipe just advances (right swipe opens the link)
      if (dir === "right" && (current as Ad).link_url) {
        window.open((current as Ad).link_url!, "_blank", "noopener,noreferrer");
      }
      setExitDir(dir);
      setTimeout(advance, 300);
      return;
    }
    if (dir === "left") {
      setExitDir("left");
      setTimeout(advance, 300);
    } else {
      // On remet la carte au centre et on ouvre la feuille "choisir mon vêtement"
      setDragX(0); dragXRef.current = 0;
      setProposingFor(current as Clothing);
    }
  }

  // Gestes tactile + souris
  function startDrag(x: number, y: number) { startX.current = x; startY.current = y; setDragging(true); }
  function moveDrag(x: number, y: number) {
    if (startX.current == null || startY.current == null) return;
    const dx = x - startX.current;
    const dy = y - startY.current;
    dragXRef.current = dx; setDragX(dx);
    dragYRef.current = dy; setDragY(dy);
  }
  function endDrag() {
    if (startX.current == null) return;
    startX.current = null; startY.current = null; setDragging(false);
    const dx = dragXRef.current;
    const dy = dragYRef.current;
    dragYRef.current = 0; setDragY(0);
    const isVertical = Math.abs(dy) > Math.abs(dx);
    // Swipe haut dominant → page de détail (ou lien publicitaire pour les ads)
    if (dy < -80 && isVertical && current) {
      setDragX(0); dragXRef.current = 0;
      if (isCurrentAd) {
        const adLink = (current as Ad).link_url;
        if (adLink) window.open(adLink, "_blank", "noopener,noreferrer");
      } else {
        router.push(`/detail/${current.id}`);
      }
      return;
    }
    // Swipe bas dominant → article précédent
    if (dy > 80 && isVertical && currentIndex > 0) {
      setDragX(0); dragXRef.current = 0;
      setExitDir(null);
      setCurrentIndex((i) => i - 1);
      return;
    }
    if (dx > 60) decide("right");
    else if (dx < -60) decide("left");
    else {
      setDragX(0); dragXRef.current = 0;
      // Tap (mouvement < 8px) → cycler la photo suivante
      if (!isCurrentAd && Math.abs(dx) < 8 && Math.abs(dy) < 8 && current) {
        const photos = getPhotos(current as Clothing);
        if (photos.length > 1) setPhotoIdx(i => (i + 1) % photos.length);
      }
    }
  }

  const overlayLike = exitDir === "right" ? 1 : Math.max(0, Math.min(1, dragX / 100));
  const overlaySkip = exitDir === "left" ? 1 : Math.max(0, Math.min(1, -dragX / 100));

  if (isBanned) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#1a1a1a", flexDirection: "column", padding: 32, textAlign: "center", fontFamily: FONT }}>
        <span style={{ fontSize: 48 }}>🚫</span>
        <h2 style={{ color: "#fff", marginTop: 16, marginBottom: 8 }}>Account suspended</h2>
        <p style={{ color: "#aaa", lineHeight: 1.6, maxWidth: 300 }}>Your account has been suspended for violating TRADE&apos;s terms of service. Contact us at tradebrussel@gmail.com if you think this is a mistake.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        height: "100dvh",
        background: "#f9f4e8",
        fontFamily: FONT,
        overflow: "hidden",
        animation: "homeEntry 0.22s ease-out both",
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          background: "#3c2f22",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingTop: "max(env(safe-area-inset-top), 44px)",
          paddingBottom: 14,
          height: "calc(68px + max(env(safe-area-inset-top), 44px))",
          zIndex: 20,
          maxWidth: 480,
          width: "100%",
        }}
      >
        <div style={{ position: "relative", width: 160, height: 48 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        {/* Logout à gauche */}
        <button
          onClick={handleLogout}
          style={{ position: "absolute", left: 14, bottom: 14, background: "transparent", border: "none", cursor: "pointer", padding: 2 }}
          aria-label="Log out"
        >
          <LogoutIcon />
        </button>
        <HeaderActions />
      </div>

      {/* ===== SCRIBBLE ===== */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 460, height: 310,
          zIndex: 2, pointerEvents: "none", opacity: 0.85,
        }}
      >
        <Image src="/home-scribble.png" alt="" fill style={{ objectFit: "contain" }} />
      </div>

      {/* ===== CARTE — hauteur dynamique selon l'écran ===== */}
      <div
        style={{
          position: "absolute",
          top: "calc(84px + max(env(safe-area-inset-top), 44px))",
          bottom: "calc(160px + env(safe-area-inset-bottom))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(332px, calc(100vw - 40px))",
          zIndex: 10,
        }}
      >
        {loading ? (
          loadError ? (
            <div style={{ width: "100%", height: "100%", borderRadius: 30, background: "#ede7d9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <span style={{ color: "#3c2f22", fontWeight: 700, fontSize: 15 }}>Connection error</span>
              <button onClick={() => window.location.reload()} style={{ marginTop: 4, height: 44, padding: "0 20px", borderRadius: 22, background: "#FFC543", border: "none", fontWeight: 800, color: "#2D1A0A", cursor: "pointer" }}>Retry</button>
            </div>
          ) : (
            <div className="skeleton" style={{ width: "100%", height: "100%", borderRadius: 30 }} />
          )
        ) : current ? (
          <div
            onTouchStart={(e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchEnd={endDrag}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => { if (dragging) moveDrag(e.clientX, e.clientY); }}
            onMouseUp={endDrag}
            onMouseLeave={() => { if (dragging) endDrag(); }}
            style={{
              position: "relative", width: "100%", height: "100%",
              cursor: dragging ? "grabbing" : "grab", touchAction: "none",
              userSelect: "none",
              transform: exitDir
                ? `translateX(${exitDir === "right" ? "110vw" : "-110vw"}) rotate(${exitDir === "right" ? 15 : -15}deg)`
                : `translateX(${dragX}px) rotate(${Math.max(-8, Math.min(8, dragX * 0.05))}deg)`,
              opacity: exitDir ? 0 : 1,
              transition: exitDir
                ? "transform 0.3s ease, opacity 0.3s ease"
                : (dragging ? "none" : "transform 0.25s ease"),
            }}
          >
            {isCurrentAd ? (
              <AdCard ad={current as Ad} />
            ) : (
              <>
                <SwipeCard card={toCard(current as Clothing)} height="100%" />
                {/* Overlay LIKE (vert) */}
                <div style={{ ...overlayBase, background: "rgba(93,143,60,0.45)", opacity: overlayLike }}>
                  <span style={overlayBadge("#5d8f3c", "-14deg")}>TRADE ✓</span>
                </div>
                {/* Overlay SKIP (rouge) */}
                <div style={{ ...overlayBase, background: "rgba(217,64,64,0.45)", opacity: overlaySkip }}>
                  <span style={overlayBadge("#d94040", "14deg")}>SKIP ✗</span>
                </div>
                {/* Featured badge */}
                {(current as Clothing).featured && (
                  <div style={{ position: "absolute", top: 14, left: 14, zIndex: 7, pointerEvents: "none" }}>
                    <span style={{ background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 11, padding: "4px 10px", borderRadius: 16, boxShadow: "0 2px 8px rgba(255,197,67,0.5)" }}>⭐ Featured</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: 30, background: "#ede7d9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#3c2f22", fontWeight: 600, opacity: 0.5 }}>No more clothes for now 👋</span>
          </div>
        )}
      </div>

      {/* ===== ← Pass | ★ | Trade → ===== */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(110px + env(safe-area-inset-bottom))",
          left: 0, right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 44,
          zIndex: 15,
        }}
      >
        <button
          onClick={() => decide("left")}
          disabled={!current}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none", cursor: current ? "pointer" : "default", padding: 2, opacity: current ? 1 : 0.4 }}
        >
          <ArrowLeft />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#d94040" }}>Pass</span>
        </button>

        <button
          onClick={async () => {
            if (!current || !currentUser || isCurrentAd) return;
            if (!saved) {
              setSaved(true);
              await supabase.from("likes").upsert(
                { user_id: currentUser.id, clothing_id: (current as Clothing).id },
                { onConflict: "user_id,clothing_id" }
              );
            } else {
              setSaved(false);
              await supabase.from("likes")
                .delete()
                .eq("user_id", currentUser.id)
                .eq("clothing_id", (current as Clothing).id);
            }
          }}
          style={{ background: "transparent", border: "none", cursor: isCurrentAd ? "default" : "pointer", padding: 2, opacity: isCurrentAd ? 0 : 1, pointerEvents: isCurrentAd ? "none" : "auto" }}
        >
          <StarIcon filled={saved} />
        </button>

        <button
          onClick={() => decide("right")}
          disabled={!current}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "none", cursor: current ? "pointer" : "default", padding: 2, opacity: current ? 1 : 0.4 }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: isCurrentAd ? "#9b8f7a" : "#5d8f3c" }}>{isCurrentAd ? "Visit" : "Trade"}</span>
          <ArrowRight />
        </button>
      </div>

      {/* ===== FEUILLE "CHOISIR MON VÊTEMENT" (Mode B) ===== */}
      {proposingFor && (
        <ProposalSheet
          target={proposingFor}
          myItems={myItems}
          available={myCoins}
          toCard={toCard}
          onCancel={() => setProposingFor(null)}
          onSend={sendProposal}
          onAddItem={() => router.push("/upload")}
        />
      )}

      {/* ===== POPUP DE MATCH ===== */}
      {showMatchPopup && matchData && (
        <MatchPopup
          data={matchData}
          onClose={() => setShowMatchPopup(false)}
          onMessage={() => { setShowMatchPopup(false); router.push("/matches"); }}
        />
      )}

    </div>
  );
}

/* ===== Ad Card — affiché à chaque position multiple de 10 dans le feed ===== */
function AdCard({ ad }: { ad: Ad }) {
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 30, overflow: "hidden", position: "relative", background: "#ece6d8" }}>
      {ad.image_url && (
        <img src={ad.image_url} alt={ad.advertiser_name ?? "Ad"} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
      )}
      {/* Gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.65) 100%)" }} />
      {/* Sponsored badge */}
      <div style={{ position: "absolute", top: 14, right: 14, background: "#FFC543", borderRadius: 20, padding: "4px 10px" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#2D1A0A", letterSpacing: 0.3 }}>Sponsored</span>
      </div>
      {/* Bottom info */}
      <div style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
        {ad.advertiser_name && (
          <p style={{ color: "#fff", fontWeight: 800, fontSize: 20, margin: "0 0 10px", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{ad.advertiser_name}</p>
        )}
        {ad.link_url && (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: "inline-block", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 14, padding: "9px 20px", borderRadius: 24, textDecoration: "none" }}
          >
            {ad.cta_text ?? "Discover"} →
          </a>
        )}
      </div>
    </div>
  );
}

/* ===== Feuille de proposition (PROVISOIRE — pas de design Figma) =====
   Tu veux un article → tu choisis lequel de TES vêtements tu proposes en échange. */
export function ProposalSheet({ target, myItems, available, toCard, onCancel, onSend, onAddItem }: {
  target: Clothing;
  myItems: Clothing[];
  available: number;
  toCard: (c: Clothing) => CardData;
  onCancel: () => void;
  onSend: (myItem: Clothing, coins: number) => void;
  onAddItem: () => void;
}) {
  const [selected, setSelected] = useState<Clothing | null>(null);
  const [coins, setCoins] = useState(0);
  const targetCard = toCard(target);

  // Plafond : max 50, et jamais plus que mon solde
  const maxCoins = Math.min(50, available);
  const step = 5;
  const dec = () => setCoins((c) => Math.max(0, c - step));
  const inc = () => setCoins((c) => Math.min(maxCoins, c + step));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90, background: "#f9f4e8",
      maxWidth: 480, margin: "0 auto",
      display: "flex", flexDirection: "column",
      animation: "sheetSlideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
    }}>
      {/* Header */}
      <div style={{ background: "#3c2f22", paddingTop: "max(16px, calc(env(safe-area-inset-top, 0px) + 8px))", paddingRight: 20, paddingBottom: 18, paddingLeft: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onCancel} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#ffc543" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ position: "relative", width: 44, height: 44, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          <img src={targetCard.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{targetCard.title}</p>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 12 }}>@{targetCard.username}</p>
        </div>
      </div>

      {/* Titre */}
      <div style={{ padding: "20px 20px 8px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#2D1A0A" }}>What do you offer in exchange?</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#7a6f5d" }}>Choose one of your items.</p>
      </div>

      {/* Grille de mes vêtements */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
        {myItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <p style={{ color: "#7a6f5d", fontSize: 14, marginBottom: 16 }}>You don&apos;t have any active item to offer yet.</p>
            <button onClick={onAddItem} style={{ height: 48, padding: "0 22px", borderRadius: 24, background: "#FFC543", border: "none", color: "#2D1A0A", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              + Add an item
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {myItems.map((it) => {
              const c = toCard(it);
              const isSel = selected?.id === it.id;
              return (
                <button
                  key={String(it.id)}
                  onClick={() => setSelected(it)}
                  style={{
                    position: "relative", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden",
                    border: isSel ? "3px solid #FFC543" : "3px solid transparent",
                    padding: 0, cursor: "pointer", background: "#ece6d8",
                    boxShadow: isSel ? "0 4px 14px rgba(255,197,67,0.5)" : "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <img src={c.photo} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {isSel && (
                    <div style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M3 11l4 4 9-10" stroke="#2D1A0A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "14px 8px 6px" }}>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{c.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {/* Complément en coins (optionnel) */}
        {myItems.length > 0 && (
          <div style={{ marginTop: 22, background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#2D1A0A" }}>Add coins to balance it out?</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
              <button onClick={dec} disabled={coins <= 0}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: coins <= 0 ? "#ece6d8" : "#2D1A0A", color: coins <= 0 ? "#b3a896" : "#FFC543", fontSize: 24, fontWeight: 800, cursor: coins <= 0 ? "default" : "pointer", lineHeight: 1 }}>−</button>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70, justifyContent: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#2D1A0A" }}>{coins}</span>
                <span style={{ position: "relative", display: "inline-block", width: 22, height: 22 }}><Image src="/coin.png" alt="" fill style={{ objectFit: "contain" }} /></span>
              </span>
              <button onClick={inc} disabled={coins >= maxCoins}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: coins >= maxCoins ? "#ece6d8" : "#2D1A0A", color: coins >= maxCoins ? "#b3a896" : "#FFC543", fontSize: 24, fontWeight: 800, cursor: coins >= maxCoins ? "default" : "pointer", lineHeight: 1 }}>+</button>
            </div>
            <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "#7a6f5d" }}>
              Available balance: <strong style={{ color: "#2D1A0A" }}>{available}</strong> coins
            </p>
          </div>
        )}
      </div>

      {/* Bouton envoyer */}
      {myItems.length > 0 && (
        <div style={{ padding: "12px 20px 24px", borderTop: "1px solid rgba(45,26,10,0.08)" }}>
          <button
            className="btn-cta"
            onClick={() => selected && onSend(selected, coins)}
            disabled={!selected}
            style={{
              width: "100%", height: 54, borderRadius: 27, border: "none",
              background: selected ? "#FFC543" : "#e6ddca",
              color: selected ? "#2D1A0A" : "#b3a896",
              fontWeight: 800, fontSize: 17,
              cursor: selected ? "pointer" : "not-allowed",
              boxShadow: selected ? "0 6px 18px rgba(255,197,67,0.45)" : "none",
            }}
          >
            Send offer{coins > 0 ? ` + ${coins} coins` : ""}
          </button>
        </div>
      )}
    </div>
  );
}

/* ===== Styles overlays swipe ===== */
const overlayBase: React.CSSProperties = {
  position: "absolute", inset: 0, borderRadius: 30,
  display: "flex", alignItems: "center", justifyContent: "center",
  pointerEvents: "none", zIndex: 6, transition: "opacity 0.12s ease",
};
function overlayBadge(color: string, rotate: string): React.CSSProperties {
  return {
    fontSize: 30, fontWeight: 800, color: "#fff",
    border: "4px solid #fff", borderRadius: 12, padding: "6px 16px",
    transform: `rotate(${rotate})`, letterSpacing: "1px",
    textShadow: "0 2px 6px rgba(0,0,0,0.25)", background: color,
  };
}

/* ===== Popup de match ===== */
function MatchPopup({ data, onClose, onMessage }: {
  data: { myPhoto: string; theirPhoto: string; theirUserId: string };
  onClose: () => void;
  onMessage: () => void;
}) {
  // Auto-fermeture après 5s sans action
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(20,12,4,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        animation: "backdropFade 0.22s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 24, padding: 32, textAlign: "center", width: "100%", maxWidth: 340, animation: "matchCardIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
      >
        <p style={{ fontSize: 28, fontWeight: 800, color: "#2D1A0A", margin: "0 0 20px" }}>🎉 It&apos;s a Match!</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24 }}>
          <img src={data.myPhoto} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover" }} />
          <img src={data.theirPhoto} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover" }} />
        </div>
        <button
          className="btn-cta"
          onClick={onMessage}
          style={{ width: "100%", height: 52, borderRadius: 26, background: "#FFC543", color: "#2D1A0A", border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 12 }}
        >
          Send a message
        </button>
        <button
          className="btn-cta"
          onClick={onClose}
          style={{ width: "100%", height: 52, borderRadius: 26, background: "transparent", color: "#2D1A0A", border: "2px solid #2D1A0A", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
        >
          Keep swiping
        </button>
      </div>
    </div>
  );
}

/* ---- autres icônes ---- */

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#ffc543" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" stroke="#ffc543" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="36" height="34" viewBox="0 0 38 36" fill="none">
      <path
        d="M19 2.5L23.7 13.8L36 15.1L27.3 23.1L29.9 35L19 28.8L8.1 35L10.7 23.1L2 15.1L14.3 13.8L19 2.5Z"
        fill={filled ? "#ffc543" : "rgba(255,197,67,0.2)"}
        stroke="#ffc543"
        strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg width="20" height="14" viewBox="0 0 22 16" fill="none">
      <path d="M21 8H1M1 8L8 1M1 8L8 15"
        stroke="#d94040" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="20" height="14" viewBox="0 0 22 16" fill="none">
      <path d="M1 8H21M21 8L14 1M21 8L14 15"
        stroke="#5d8f3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
