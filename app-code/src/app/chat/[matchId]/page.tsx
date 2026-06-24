"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Message = { id: string | number; match_id: string; sender_id: string; body: string; created_at?: string };
type Match = {
  id: string;
  user_a_uid: string; user_b_uid: string;
  clothing_a_id: number | string; clothing_b_id: number | string;
  status?: string; confirmed_a?: boolean; confirmed_b?: boolean;
};
type ClothingItem = { id: string | number; title?: string; image_url?: string; size?: string; condition?: string };

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : (params.matchId as string);

  const [me, setMe] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("Chat");
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Proposition d'échange
  const [showProposal, setShowProposal] = useState(false);
  const [proposalTab, setProposalTab] = useState<"mine" | "theirs">("theirs");
  const [myItems, setMyItems] = useState<ClothingItem[]>([]);
  const [theirItems, setTheirItems] = useState<ClothingItem[]>([]);
  const [selectedMine, setSelectedMine] = useState<ClothingItem | null>(null);
  const [selectedTheirs, setSelectedTheirs] = useState<ClothingItem | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      // Match (status, confirmations, items)
      try {
        const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).single();
        if (m) {
          setMatch(m as Match);
          const oid = m.user_a_uid === user.id ? m.user_b_uid : m.user_a_uid;
          setOtherId(oid);
          try {
            const { data: prof } = await supabase.from("profiles").select("username").eq("id", oid).single();
            if (prof?.username) setOtherName("@" + prof.username);
          } catch { /* profiles optional */ }

          // Already rated this trade?
          try {
            const { data: r } = await supabase.from("ratings").select("id")
              .eq("match_id", matchId).eq("rater_id", user.id);
            if (r && r.length > 0) setRated(true);
            else if (m.status === "completed") setShowRating(true);
          } catch { /* ratings table optional */ }
        }
      } catch { /* matches optional */ }

      // Messages history
      try {
        const { data: msgs } = await supabase.from("messages").select("*")
          .eq("match_id", matchId).order("created_at", { ascending: true });
        setMessages((msgs as Message[]) ?? []);
      } catch (e) { console.error("chat messages error:", e); }
    }
    init();
  }, [matchId, router]);

  // Realtime new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => {
            const msg = payload.new as Message;
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || !me) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body: text });
    if (error) console.error("send error:", error);
  }

  async function openProposal() {
    setSelectedMine(null); setSelectedTheirs(null); setProposalTab("theirs");
    if (me && myItems.length === 0) {
      const { data } = await supabase.from("clothing").select("id,title,image_url,size,condition")
        .eq("user_id", me).eq("status", "active");
      setMyItems((data as ClothingItem[]) ?? []);
    }
    if (otherId && theirItems.length === 0) {
      const { data } = await supabase.from("clothing").select("id,title,image_url,size,condition")
        .eq("user_id", otherId).eq("status", "active");
      setTheirItems((data as ClothingItem[]) ?? []);
    }
    setShowProposal(true);
  }

  async function sendTradeProposal() {
    if (!selectedMine || !selectedTheirs || !me) return;
    const body = `🔄 Proposition d'échange :\n👕 Mon article : ${selectedMine.title ?? "Article"} (${selectedMine.size ?? "?"})\n👕 Ton article : ${selectedTheirs.title ?? "Article"} (${selectedTheirs.size ?? "?"})`;
    await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body });
    setShowProposal(false);
  }

  const mySide: "a" | "b" | null = !match || !me ? null : match.user_a_uid === me ? "a" : "b";
  const iConfirmed = !match ? false : mySide === "a" ? !!match.confirmed_a : !!match.confirmed_b;
  const completed = match?.status === "completed";

  // Confirme la réception → si les deux ont confirmé, complète le trade
  async function confirmReceived() {
    if (!match || !me || !mySide) return;
    const patch = mySide === "a" ? { confirmed_a: true } : { confirmed_b: true };
    await supabase.from("matches").update(patch).eq("id", match.id);

    const updated: Match = { ...match, ...patch };
    setMatch(updated);

    const bothConfirmed = !!updated.confirmed_a && !!updated.confirmed_b;
    if (bothConfirmed) await completeTrade(updated);
  }

  async function completeTrade(m: Match) {
    try {
      // Prix des deux vêtements
      const { data: ca } = await supabase.from("clothing").select("price_coins").eq("id", m.clothing_a_id).single();
      const { data: cb } = await supabase.from("clothing").select("price_coins").eq("id", m.clothing_b_id).single();
      const pa = ca?.price_coins ?? 0;
      const pb = cb?.price_coins ?? 0;

      // A reçoit clothing_b, B reçoit clothing_a → on crédite le receveur du plus cher
      let winner: string | null = null;
      let amount = 0;
      if (pa > pb) { winner = m.user_b_uid; amount = pa - pb; }
      else if (pb > pa) { winner = m.user_a_uid; amount = pb - pa; }

      if (winner && amount > 0) {
        const { data: wp } = await supabase.from("profiles").select("coins_balance").eq("id", winner).single();
        const bal = wp?.coins_balance ?? 0;
        await supabase.from("profiles").update({ coins_balance: bal + amount }).eq("id", winner);
      }

      const aGets = winner === m.user_a_uid ? amount : 0;
      const bGets = winner === m.user_b_uid ? amount : 0;
      await supabase.from("transactions").insert([
        { user_id: m.user_a_uid, type: aGets > 0 ? "received" : "trade", amount: aGets, description: "Trade completed" },
        { user_id: m.user_b_uid, type: bGets > 0 ? "received" : "trade", amount: bGets, description: "Trade completed" },
      ]);

      await supabase.from("matches").update({ status: "completed" }).eq("id", m.id);
      setMatch({ ...m, status: "completed" });
      if (!rated) setShowRating(true);
    } catch (e) {
      console.error("completeTrade error:", e);
    }
  }

  async function submitRating(stars: number) {
    if (!me || !otherId) return;
    try {
      await supabase.from("ratings").insert({ match_id: matchId, rater_id: me, rated_id: otherId, stars });
    } catch (e) { console.error("rating error:", e); }
    setRated(true);
    setShowRating(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        background: "#3c2f22", flexShrink: 0,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        display: "flex", alignItems: "flex-end",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingLeft: 18, paddingRight: 18, paddingBottom: 16,
      }}>
        <button onClick={() => router.push("/matches")} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, marginRight: 8 }} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 19 }}>{otherName}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.4, fontSize: 14, marginTop: 24 }}>Start the conversation 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={String(m.id)} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "76%", padding: "10px 14px", fontSize: 15, lineHeight: 1.35, color: "#2D1A0A",
                background: mine ? "#FFC543" : "#E8E4DC",
                borderRadius: mine ? "20px 20px 4px 20px" : "20px 20px 20px 4px", wordBreak: "break-word",
              }}>{m.body}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Barre de confirmation d'échange */}
      {match && !completed && (
        <div style={{ flexShrink: 0, padding: "10px 14px 0" }}>
          {iConfirmed ? (
            <div style={{ textAlign: "center", fontSize: 13, color: "#2D1A0A", opacity: 0.65, padding: "8px 0" }}>
              Waiting for {otherName} to confirm…
            </div>
          ) : (
            <button
              onClick={confirmReceived}
              style={{ width: "100%", height: 48, borderRadius: 24, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              Confirm item received ✓
            </button>
          )}
        </div>
      )}
      {completed && (
        <div style={{ flexShrink: 0, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#5d8f3c", padding: "10px 0 0" }}>
          ✓ Trade completed
        </div>
      )}

      {/* Bouton "Proposer un échange" */}
      <div style={{ flexShrink: 0, padding: "6px 14px 0" }}>
        <button
          onClick={openProposal}
          style={{ width: "100%", height: 42, borderRadius: 21, border: "1.5px solid #3c2f22", background: "transparent", color: "#3c2f22", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          🔄 Proposer un échange
        </button>
      </div>

      {/* Barre d'envoi */}
      <div style={{ flexShrink: 0, padding: "8px 14px 18px", display: "flex", gap: 10, alignItems: "center", background: "#F9F4E8" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Write a message…"
          style={{ flex: 1, height: 50, background: "#E8E4DC", border: "none", borderRadius: 26, padding: "0 20px", fontSize: 15, color: "#2D1A0A", outline: "none" }}
        />
        <button onClick={send} style={{ height: 50, padding: "0 22px", borderRadius: 26, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Send
        </button>
      </div>

      {/* Sheet — proposition d'échange */}
      {showProposal && (
        <div onClick={() => setShowProposal(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,12,4,0.55)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#F9F4E8", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
            {/* En-tête sheet */}
            <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#3c2f22" }}>Proposer un échange</p>
              <button onClick={() => setShowProposal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#3c2f22", lineHeight: 1 }}>×</button>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", margin: "12px 20px 0", background: "#ede8dc", borderRadius: 20, padding: 3 }}>
              {(["theirs", "mine"] as const).map((tab) => (
                <button key={tab} onClick={() => setProposalTab(tab)} style={{ flex: 1, height: 36, borderRadius: 17, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: proposalTab === tab ? "#3c2f22" : "transparent", color: proposalTab === tab ? "#FFC543" : "#3c2f22", transition: "background 0.15s" }}>
                  {tab === "theirs" ? `Ses articles` : "Mes articles"}
                </button>
              ))}
            </div>
            {/* Grille articles */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              {(proposalTab === "mine" ? myItems : theirItems).length === 0
                ? <p style={{ textAlign: "center", color: "#9b8f7a", fontSize: 14, marginTop: 20 }}>Aucun article disponible</p>
                : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {(proposalTab === "mine" ? myItems : theirItems).map((item) => {
                      const sel = proposalTab === "mine" ? selectedMine : selectedTheirs;
                      const isSelected = sel?.id === item.id;
                      return (
                        <div key={String(item.id)} onClick={() => proposalTab === "mine" ? setSelectedMine(item) : setSelectedTheirs(item)}
                          style={{ borderRadius: 14, overflow: "hidden", border: isSelected ? "3px solid #FFC543" : "3px solid transparent", cursor: "pointer", position: "relative", aspectRatio: "1/1", background: "#ddd" }}>
                          {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          {isSelected && <div style={{ position: "absolute", inset: 0, background: "rgba(255,197,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22 }}>✓</span></div>}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", padding: "3px 6px" }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title ?? "Article"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
            {/* Résumé de la sélection */}
            {(selectedMine || selectedTheirs) && (
              <div style={{ padding: "10px 16px 0", display: "flex", gap: 8 }}>
                {[{ label: "Mon article", item: selectedMine }, { label: "Son article", item: selectedTheirs }].map(({ label, item }) => (
                  <div key={label} style={{ flex: 1, background: "#ede8dc", borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    {item?.image_url && <img src={item.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: "#9b8f7a", fontWeight: 600 }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#3c2f22" }}>{item ? (item.title ?? "Article") : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Bouton envoyer */}
            <div style={{ padding: "12px 16px 28px" }}>
              <button
                onClick={sendTradeProposal}
                disabled={!selectedMine || !selectedTheirs}
                style={{ width: "100%", height: 54, borderRadius: 27, border: "none", background: selectedMine && selectedTheirs ? "#FFC543" : "#e6ddca", color: selectedMine && selectedTheirs ? "#2D1A0A" : "#b3a896", fontWeight: 800, fontSize: 16, cursor: selectedMine && selectedTheirs ? "pointer" : "not-allowed", boxShadow: selectedMine && selectedTheirs ? "0 6px 18px rgba(255,197,67,0.4)" : "none" }}
              >
                Envoyer la proposition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de rating */}
      {showRating && !rated && (
        <RatingPopup otherName={otherName} onSubmit={submitRating} onClose={() => setShowRating(false)} />
      )}
    </div>
  );
}

/* ===== Popup de notation ===== */
function RatingPopup({ otherName, onSubmit, onClose }: {
  otherName: string; onSubmit: (stars: number) => void; onClose: () => void;
}) {
  const [stars, setStars] = useState(0);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,4,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: 30, textAlign: "center", width: "100%", maxWidth: 340 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#2D1A0A", margin: "0 0 20px", lineHeight: 1.4 }}>
          How was the trade with {otherName}?
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, fontSize: 36, lineHeight: 1, color: "#FFC543" }}>
              {n <= stars ? "★" : "☆"}
            </button>
          ))}
        </div>
        <button
          onClick={() => stars > 0 && onSubmit(stars)}
          disabled={stars === 0}
          style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: stars > 0 ? "#FFC543" : "#e6ddca", color: stars > 0 ? "#2D1A0A" : "#b3a896", fontWeight: 800, fontSize: 16, cursor: stars > 0 ? "pointer" : "not-allowed" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
