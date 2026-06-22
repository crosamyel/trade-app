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
        height: 112, display: "flex", alignItems: "flex-end", padding: "0 18px 16px",
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

      {/* Barre d'envoi */}
      <div style={{ flexShrink: 0, padding: "10px 14px 18px", display: "flex", gap: 10, alignItems: "center", background: "#F9F4E8" }}>
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
