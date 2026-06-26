"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Message = { id: string | number; match_id: string; sender_id: string; body: string; created_at?: string };
type Match = {
  id: string;
  user_a_uid: string; user_b_uid: string;
  clothing_a_id?: number | string | null;
  clothing_b_id?: number | string | null;
  status?: string;
  trade_status?: string;
  confirmed_a?: boolean; confirmed_b?: boolean;
  user_a_shipped?: boolean; user_b_shipped?: boolean;
  proposal_sender_id?: string;
};
type ClothingItem = { id: string | number; title?: string; image_url?: string; size?: string; condition?: string };
type TradeAddress = {
  user_id?: string; full_name?: string; street?: string;
  city?: string; postal_code?: string; country?: string;
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

  // Proposal sheet
  const [showProposal, setShowProposal] = useState(false);
  const [proposalTab, setProposalTab] = useState<"mine" | "theirs">("theirs");
  const [myItems, setMyItems] = useState<ClothingItem[]>([]);
  const [theirItems, setTheirItems] = useState<ClothingItem[]>([]);
  const [selectedMine, setSelectedMine] = useState<ClothingItem | null>(null);
  const [selectedTheirs, setSelectedTheirs] = useState<ClothingItem | null>(null);

  // Addresses
  const [myAddress, setMyAddress] = useState<TradeAddress | null>(null);
  const [partnerAddress, setPartnerAddress] = useState<TradeAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ full_name: "", street: "", city: "", postal_code: "", country: "Belgium" });
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrExpanded, setAddrExpanded] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMe(user.id);

      try {
        const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).single();
        if (m) {
          setMatch(m as Match);
          const oid = m.user_a_uid === user.id ? m.user_b_uid : m.user_a_uid;
          setOtherId(oid);
          try {
            const { data: prof } = await supabase.from("profiles").select("username").eq("id", oid).single();
            if (prof?.username) setOtherName("@" + prof.username);
          } catch { /* ok */ }

          try {
            const { data: r } = await supabase.from("ratings").select("id").eq("match_id", matchId).eq("rater_id", user.id);
            if (r && r.length > 0) setRated(true);
            else {
              const ts = m.trade_status ?? m.status;
              if (ts === "completed") setShowRating(true);
            }
          } catch { /* ok */ }

          const ts = m.trade_status;
          if (ts === "proposal_accepted" || ts === "both_shipped" || ts === "completed") {
            const partnerId = m.user_a_uid === user.id ? m.user_b_uid : m.user_a_uid;
            await fetchAddresses(user.id, partnerId);
          }
        }
      } catch { /* ok */ }

      try {
        const { data: msgs } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
        setMessages((msgs as Message[]) ?? []);
      } catch (e) { console.error("msgs:", e); }
    }
    init();
  }, [matchId, router]);

  // Realtime: new messages
  useEffect(() => {
    const ch = supabase.channel(`msgs:${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages(prev => {
          const msg = payload.new as Message;
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  // Realtime: match updates (shipping, acceptance, etc.)
  useEffect(() => {
    const ch = supabase.channel(`match:${matchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, (payload) => {
        setMatch(prev => prev ? { ...prev, ...(payload.new as Match) } : null);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function fetchAddresses(myId: string, partnerId: string) {
    try {
      const { data: mine } = await supabase.from("trade_addresses").select("*").eq("user_id", myId).maybeSingle();
      if (mine) setMyAddress(mine as TradeAddress);
    } catch { /* table may not exist yet */ }
    try {
      const { data: theirs } = await supabase.from("trade_addresses").select("*").eq("user_id", partnerId).maybeSingle();
      if (theirs) setPartnerAddress(theirs as TradeAddress);
    } catch { /* ok */ }
  }

  function openAddressForm() {
    if (myAddress) {
      setAddrForm({
        full_name: myAddress.full_name ?? "",
        street: myAddress.street ?? "",
        city: myAddress.city ?? "",
        postal_code: myAddress.postal_code ?? "",
        country: myAddress.country ?? "Belgium",
      });
    }
    setShowAddressForm(true);
  }

  async function saveAddress() {
    if (!me) return;
    setSavingAddr(true);
    try {
      await supabase.from("trade_addresses").upsert({
        user_id: me,
        full_name: addrForm.full_name,
        street: addrForm.street,
        city: addrForm.city,
        postal_code: addrForm.postal_code,
        country: addrForm.country,
      }, { onConflict: "user_id" });
      setMyAddress({ user_id: me, ...addrForm });
      setShowAddressForm(false);
    } catch (e) { console.error("save addr:", e); }
    setSavingAddr(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || !me) return;
    setInput("");
    await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body: text });
  }

  async function openProposal() {
    setSelectedMine(null); setSelectedTheirs(null); setProposalTab("theirs");
    if (me && myItems.length === 0) {
      const { data } = await supabase.from("clothing").select("id,title,image_url,size,condition").eq("user_id", me).eq("status", "active");
      setMyItems((data as ClothingItem[]) ?? []);
    }
    if (otherId && theirItems.length === 0) {
      const { data } = await supabase.from("clothing").select("id,title,image_url,size,condition").eq("user_id", otherId).eq("status", "active");
      setTheirItems((data as ClothingItem[]) ?? []);
    }
    setShowProposal(true);
  }

  async function sendTradeProposal() {
    if (!selectedMine || !selectedTheirs || !me || !match) return;
    const body = `🔄 Trade proposal:\n👕 My item: ${selectedMine.title ?? "Item"} (${selectedMine.size ?? "?"})\n👕 Their item: ${selectedTheirs.title ?? "Item"} (${selectedTheirs.size ?? "?"})`;
    await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body });
    try {
      await supabase.from("matches").update({
        trade_status: "proposal_sent",
        proposal_sender_id: me,
        proposed_at: new Date().toISOString(),
      }).eq("id", matchId);
      setMatch(prev => prev ? { ...prev, trade_status: "proposal_sent", proposal_sender_id: me } : null);
    } catch { /* new columns may not exist yet */ }
    setShowProposal(false);
  }

  async function acceptProposal() {
    if (!match || !me) return;
    try {
      await supabase.from("matches").update({ trade_status: "proposal_accepted", accepted_at: new Date().toISOString() }).eq("id", matchId);
      setMatch(prev => prev ? { ...prev, trade_status: "proposal_accepted" } : null);
      await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body: "✅ Trade accepted! Ship your items to each other." });
      if (otherId) await fetchAddresses(me, otherId);
      setAddrExpanded(true);
    } catch (e) { console.error("accept:", e); }
  }

  async function declineProposal() {
    if (!match || !me) return;
    try {
      await supabase.from("matches").update({ trade_status: "matched", proposal_sender_id: null }).eq("id", matchId);
      setMatch(prev => prev ? { ...prev, trade_status: "matched", proposal_sender_id: undefined } : null);
      await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body: "❌ Proposal declined." });
    } catch (e) { console.error("decline:", e); }
  }

  async function confirmShipped() {
    if (!match || !me || !mySide) return;
    const patch = mySide === "a" ? { user_a_shipped: true } : { user_b_shipped: true };
    try {
      await supabase.from("matches").update(patch).eq("id", matchId);
      const updated = { ...match, ...patch };
      if (updated.user_a_shipped && updated.user_b_shipped) {
        await supabase.from("matches").update({ trade_status: "both_shipped" }).eq("id", matchId);
        updated.trade_status = "both_shipped";
        await supabase.from("messages").insert({ match_id: matchId, sender_id: me, body: "📦 Both items shipped! Confirm receipt when yours arrives." });
      }
      setMatch(updated);
    } catch (e) { console.error("shipped:", e); }
  }

  async function confirmReceived() {
    if (!match || !me || !mySide) return;
    const patch = mySide === "a" ? { confirmed_a: true } : { confirmed_b: true };
    try {
      await supabase.from("matches").update(patch).eq("id", matchId);
      const updated: Match = { ...match, ...patch };
      setMatch(updated);
      if (updated.confirmed_a && updated.confirmed_b) await completeTrade(updated);
    } catch (e) { console.error("received:", e); }
  }

  async function completeTrade(m: Match) {
    try {
      if (m.clothing_a_id && m.clothing_b_id) {
        const { data: ca } = await supabase.from("clothing").select("price_coins").eq("id", m.clothing_a_id).single();
        const { data: cb } = await supabase.from("clothing").select("price_coins").eq("id", m.clothing_b_id).single();
        const pa = ca?.price_coins ?? 0, pb = cb?.price_coins ?? 0;
        let winner: string | null = null, amount = 0;
        if (pa > pb) { winner = m.user_b_uid; amount = pa - pb; }
        else if (pb > pa) { winner = m.user_a_uid; amount = pb - pa; }
        if (winner && amount > 0) {
          const { data: wp } = await supabase.from("profiles").select("coins_balance").eq("id", winner).single();
          await supabase.from("profiles").update({ coins_balance: (wp?.coins_balance ?? 0) + amount }).eq("id", winner);
        }
        const aGets = winner === m.user_a_uid ? amount : 0;
        const bGets = winner === m.user_b_uid ? amount : 0;
        await supabase.from("transactions").insert([
          { user_id: m.user_a_uid, type: aGets > 0 ? "received" : "trade", amount: aGets, description: "Trade completed" },
          { user_id: m.user_b_uid, type: bGets > 0 ? "received" : "trade", amount: bGets, description: "Trade completed" },
        ]);
      }
      await supabase.from("matches").update({ status: "completed", trade_status: "completed", completed_at: new Date().toISOString() }).eq("id", m.id);
      setMatch({ ...m, status: "completed", trade_status: "completed" });
      if (!rated) setShowRating(true);
    } catch (e) { console.error("completeTrade:", e); }
  }

  async function submitRating(stars: number) {
    if (!me || !otherId) return;
    try {
      await supabase.from("ratings").insert({ match_id: matchId, rater_id: me, rated_id: otherId, stars });
    } catch { /* ok */ }
    setRated(true);
    setShowRating(false);
  }

  // Derived state
  const mySide: "a" | "b" | null = !match || !me ? null : match.user_a_uid === me ? "a" : "b";
  const tradeStatus = match?.trade_status ?? (match?.status === "completed" ? "completed" : "matched");
  const isDirectChat = !match?.clothing_a_id && !match?.clothing_b_id;
  const iAmSender = match?.proposal_sender_id === me;
  const myShipped = mySide === "a" ? !!match?.user_a_shipped : !!match?.user_b_shipped;
  const otherShipped = mySide === "a" ? !!match?.user_b_shipped : !!match?.user_a_shipped;
  const iConfirmed = mySide === "a" ? !!match?.confirmed_a : !!match?.confirmed_b;
  const showProposalButton = isDirectChat || tradeStatus === "matched";

  function renderTradeAction() {
    if (isDirectChat) return null;

    if (tradeStatus === "proposal_sent") {
      if (iAmSender) {
        return (
          <div style={{ margin: "0 14px 6px", padding: "10px 16px", background: "#f0eadf", borderRadius: 14, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#7a6f5d", fontWeight: 600 }}>⏳ Waiting for {otherName} to respond…</p>
          </div>
        );
      }
      return (
        <div style={{ padding: "6px 14px 0", display: "flex", gap: 10 }}>
          <button onClick={declineProposal} style={{ flex: 1, height: 48, borderRadius: 24, border: "2px solid #d94040", background: "transparent", color: "#d94040", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            ✗ Decline
          </button>
          <button onClick={acceptProposal} style={{ flex: 1, height: 48, borderRadius: 24, border: "none", background: "#5d8f3c", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            ✓ Accept
          </button>
        </div>
      );
    }

    if (tradeStatus === "proposal_accepted") {
      if (!myShipped) {
        return (
          <div style={{ padding: "6px 14px 0" }}>
            <button onClick={confirmShipped} style={{ width: "100%", height: 48, borderRadius: 24, border: "none", background: "#3c2f22", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              📦 I shipped my item
            </button>
          </div>
        );
      }
      if (!otherShipped) {
        return (
          <div style={{ padding: "6px 14px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#5d8f3c", fontWeight: 700 }}>✓ You shipped! Waiting for {otherName} to ship…</p>
          </div>
        );
      }
    }

    if (tradeStatus === "both_shipped") {
      if (!iConfirmed) {
        return (
          <div style={{ padding: "6px 14px 0" }}>
            <button onClick={confirmReceived} style={{ width: "100%", height: 48, borderRadius: 24, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              ✅ I received my item
            </button>
          </div>
        );
      }
      return (
        <div style={{ padding: "6px 14px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#5d8f3c", fontWeight: 700 }}>✓ Received! Waiting for {otherName} to confirm…</p>
        </div>
      );
    }

    if (tradeStatus === "completed") {
      return (
        <div style={{ padding: "8px 14px", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5d8f3c" }}>🎉 Trade completed!</p>
        </div>
      );
    }

    return null;
  }

  const showShippingSection = !isDirectChat && (tradeStatus === "proposal_accepted" || tradeStatus === "both_shipped");

  const statusBadge: Record<string, string> = {
    proposal_sent: "Pending",
    proposal_accepted: "Shipping",
    both_shipped: "In transit",
    completed: "Done ✓",
  };

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
        {!isDirectChat && statusBadge[tradeStatus] && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#FFC543", background: "rgba(255,197,67,0.18)", borderRadius: 12, padding: "4px 10px" }}>
            {statusBadge[tradeStatus]}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: "center", color: "#2D1A0A", opacity: 0.4, fontSize: 14, marginTop: 24 }}>Start the conversation 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          const isProposal = m.body.startsWith("🔄 Trade proposal:");
          const isSystem = m.body.startsWith("✅ Trade accepted") || m.body.startsWith("❌ Proposal") || m.body.startsWith("📦 Both items");

          if (isSystem) {
            return (
              <div key={String(m.id)} style={{ textAlign: "center", padding: "4px 0" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9b8f7a", background: "#ede8dc", borderRadius: 12, padding: "4px 12px" }}>{m.body}</span>
              </div>
            );
          }

          if (isProposal) {
            return (
              <div key={String(m.id)} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", background: mine ? "#FFF3CC" : "#E8E4DC", borderRadius: mine ? "20px 20px 4px 20px" : "20px 20px 20px 4px", padding: "12px 14px", border: `1.5px solid ${mine ? "#FFC543" : "#d8d2c4"}` }}>
                  {m.body.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: i > 0 ? "4px 0 0" : 0, fontSize: 14, color: "#2D1A0A", lineHeight: 1.4 }}>{line}</p>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={String(m.id)} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "76%", padding: "10px 14px", fontSize: 15, lineHeight: 1.35, color: "#2D1A0A", background: mine ? "#FFC543" : "#E8E4DC", borderRadius: mine ? "20px 20px 4px 20px" : "20px 20px 20px 4px", wordBreak: "break-word" }}>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Shipping info — collapsible, shown when proposal accepted or in transit */}
      {showShippingSection && (
        <div style={{ flexShrink: 0, margin: "0 14px 4px", background: "#ede8dc", borderRadius: 18, overflow: "hidden" }}>
          <button
            onClick={() => setAddrExpanded(e => !e)}
            style={{ width: "100%", padding: "11px 16px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#3c2f22" }}>📬 Shipping info</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: addrExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
              <path d="M6 9l6 6 6-6" stroke="#3c2f22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {addrExpanded && (
            <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {myAddress ? (
                <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8f7a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Your address (for {otherName} to ship to)</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#3c2f22", lineHeight: 1.6 }}>
                    {myAddress.full_name}<br />{myAddress.street}<br />
                    {myAddress.postal_code} {myAddress.city}<br />{myAddress.country}
                  </p>
                  <button onClick={openAddressForm} style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#3c2f22", opacity: 0.6, textDecoration: "underline", padding: 0 }}>Edit</button>
                </div>
              ) : (
                <button onClick={openAddressForm} style={{ padding: "12px 14px", background: "#fff", borderRadius: 14, border: "2px dashed #FFC543", cursor: "pointer", textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#3c2f22" }}>+ Add your shipping address</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9b8f7a" }}>Required to complete the trade</p>
                </button>
              )}
              {partnerAddress ? (
                <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9b8f7a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ship your item to</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#3c2f22", lineHeight: 1.6 }}>
                    {partnerAddress.full_name}<br />{partnerAddress.street}<br />
                    {partnerAddress.postal_code} {partnerAddress.city}<br />{partnerAddress.country}
                  </p>
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 14, padding: "10px 14px" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#9b8f7a", fontStyle: "italic" }}>⏳ Waiting for {otherName} to add their address…</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trade action bar */}
      <div style={{ flexShrink: 0 }}>{renderTradeAction()}</div>

      {/* Propose a trade button */}
      {showProposalButton && (
        <div style={{ flexShrink: 0, padding: "6px 14px 0" }}>
          <button onClick={openProposal} style={{ width: "100%", height: 42, borderRadius: 21, border: "1.5px solid #3c2f22", background: "transparent", color: "#3c2f22", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            🔄 Propose a trade
          </button>
        </div>
      )}

      {/* Message input */}
      <div style={{ flexShrink: 0, padding: "8px 14px 18px", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Write a message…"
          style={{ flex: 1, height: 50, background: "#E8E4DC", border: "none", borderRadius: 26, padding: "0 20px", fontSize: 15, color: "#2D1A0A", outline: "none" }}
        />
        <button onClick={send} style={{ height: 50, padding: "0 22px", borderRadius: 26, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Send
        </button>
      </div>

      {/* Proposal sheet */}
      {showProposal && (
        <div onClick={() => setShowProposal(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,12,4,0.55)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#F9F4E8", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#3c2f22" }}>Propose a trade</p>
              <button onClick={() => setShowProposal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: "#3c2f22", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", margin: "12px 20px 0", background: "#ede8dc", borderRadius: 20, padding: 3 }}>
              {(["theirs", "mine"] as const).map(tab => (
                <button key={tab} onClick={() => setProposalTab(tab)} style={{ flex: 1, height: 36, borderRadius: 17, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: proposalTab === tab ? "#3c2f22" : "transparent", color: proposalTab === tab ? "#FFC543" : "#3c2f22", transition: "background 0.15s" }}>
                  {tab === "theirs" ? "Their items" : "My items"}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              {(proposalTab === "mine" ? myItems : theirItems).length === 0
                ? <p style={{ textAlign: "center", color: "#9b8f7a", fontSize: 14, marginTop: 20 }}>No items available</p>
                : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {(proposalTab === "mine" ? myItems : theirItems).map(item => {
                      const sel = proposalTab === "mine" ? selectedMine : selectedTheirs;
                      const isSelected = sel?.id === item.id;
                      return (
                        <div key={String(item.id)} onClick={() => proposalTab === "mine" ? setSelectedMine(item) : setSelectedTheirs(item)}
                          style={{ borderRadius: 14, overflow: "hidden", border: isSelected ? "3px solid #FFC543" : "3px solid transparent", cursor: "pointer", position: "relative", aspectRatio: "1/1", background: "#ddd" }}>
                          {item.image_url && <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          {isSelected && <div style={{ position: "absolute", inset: 0, background: "rgba(255,197,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22 }}>✓</span></div>}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", padding: "3px 6px" }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title ?? "Item"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
            {(selectedMine || selectedTheirs) && (
              <div style={{ padding: "10px 16px 0", display: "flex", gap: 8 }}>
                {[{ label: "My item", item: selectedMine }, { label: "Their item", item: selectedTheirs }].map(({ label, item }) => (
                  <div key={label} style={{ flex: 1, background: "#ede8dc", borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    {item?.image_url && <img src={item.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                    <div>
                      <p style={{ margin: 0, fontSize: 10, color: "#9b8f7a", fontWeight: 600 }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#3c2f22" }}>{item ? (item.title ?? "Item") : "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: "12px 16px 28px" }}>
              <button onClick={sendTradeProposal} disabled={!selectedMine || !selectedTheirs} style={{ width: "100%", height: 54, borderRadius: 27, border: "none", background: selectedMine && selectedTheirs ? "#FFC543" : "#e6ddca", color: selectedMine && selectedTheirs ? "#2D1A0A" : "#b3a896", fontWeight: 800, fontSize: 16, cursor: selectedMine && selectedTheirs ? "pointer" : "not-allowed", boxShadow: selectedMine && selectedTheirs ? "0 6px 18px rgba(255,197,67,0.4)" : "none" }}>
                Send proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address form */}
      {showAddressForm && (
        <div onClick={() => setShowAddressForm(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,12,4,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#F9F4E8", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: "24px 20px 36px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#3c2f22" }}>Shipping address</p>
              <button onClick={() => setShowAddressForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: "#3c2f22" }}>×</button>
            </div>
            {([
              { key: "full_name", label: "Full name", placeholder: "Jane Doe" },
              { key: "street", label: "Street & number", placeholder: "Rue de la Paix 12" },
              { key: "city", label: "City", placeholder: "Brussels" },
              { key: "postal_code", label: "Postal code", placeholder: "1000" },
              { key: "country", label: "Country", placeholder: "Belgium" },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#3c2f22", marginBottom: 4 }}>{f.label}</label>
                <input
                  value={addrForm[f.key]}
                  onChange={e => setAddrForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", height: 48, background: "#ede8dc", border: "none", borderRadius: 24, padding: "0 18px", fontSize: 15, color: "#3c2f22", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <button onClick={saveAddress} disabled={savingAddr} style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 16, cursor: savingAddr ? "not-allowed" : "pointer", marginTop: 8, opacity: savingAddr ? 0.7 : 1 }}>
              {savingAddr ? "Saving…" : "Save address"}
            </button>
          </div>
        </div>
      )}

      {/* Rating popup */}
      {showRating && !rated && (
        <RatingPopup otherName={otherName} onSubmit={submitRating} onClose={() => setShowRating(false)} />
      )}
    </div>
  );
}

function RatingPopup({ otherName, onSubmit, onClose }: { otherName: string; onSubmit: (stars: number) => void; onClose: () => void }) {
  const [stars, setStars] = useState(0);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,12,4,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: 30, textAlign: "center", width: "100%", maxWidth: 340 }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#2D1A0A", margin: "0 0 20px", lineHeight: 1.4 }}>How was the trade with {otherName}?</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setStars(n)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, fontSize: 36, lineHeight: 1, color: "#FFC543" }}>
              {n <= stars ? "★" : "☆"}
            </button>
          ))}
        </div>
        <button onClick={() => stars > 0 && onSubmit(stars)} disabled={stars === 0} style={{ width: "100%", height: 52, borderRadius: 26, border: "none", background: stars > 0 ? "#FFC543" : "#e6ddca", color: stars > 0 ? "#2D1A0A" : "#b3a896", fontWeight: 800, fontSize: 16, cursor: stars > 0 ? "pointer" : "not-allowed" }}>
          Send
        </button>
      </div>
    </div>
  );
}
