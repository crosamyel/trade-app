"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function InstallPage() {
  const router = useRouter();

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isPWA) router.replace("/");
  }, [router]);

  return (
    <div style={{
      background: "#f9f4e8",
      minHeight: "100dvh",
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 1; }
          70%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes tap {
          0%,100% { transform: scale(1); opacity: 1; }
          40%     { transform: scale(0.82); opacity: 0.7; }
        }
        .pulse-dot::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #FFC543;
          animation: pulse-ring 1.6s ease-out infinite;
        }
        .tap-anim { animation: tap 1.6s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#3c2f22",
        height: "calc(80px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexShrink: 0,
      }}>
        <div style={{ position: "relative", width: 90, height: 46 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} priority />
        </div>
      </div>

      <div style={{ padding: "24px 20px 48px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#3c2f22", textAlign: "center", margin: "0 0 6px", lineHeight: 1.2 }}>
          Add TRADE to your<br />Home Screen
        </h1>
        <p style={{ fontSize: 13, color: "#7a6f5d", textAlign: "center", margin: "0 0 24px", lineHeight: 1.5 }}>
          3 taps in Safari and you&apos;re done.
        </p>

        {/* ── STEP 1 ── */}
        <StepCard num={1} title='Tap "···" at the bottom right'>
          <SafariBar highlightDots />
        </StepCard>

        <Arrow />

        {/* ── STEP 2 ── */}
        <StepCard num={2} title='Tap "Share"'>
          <ShareRow />
        </StepCard>

        <Arrow />

        {/* ── STEP 3 ── */}
        <StepCard num={3} title='"Add to Home Screen" → Add'>
          <AddToHomeRow />
        </StepCard>

        {/* Tip */}
        <div style={{
          marginTop: 20, background: "rgba(255,197,67,0.18)", borderRadius: 16,
          padding: "13px 16px", border: "1.5px solid #ffc543", width: "100%",
        }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "#8a6d2a", lineHeight: 1.5, textAlign: "center", fontWeight: 600 }}>
            💡 Once installed, TRADE opens full screen — just like a real app.
          </p>
        </div>

      </div>

      <div style={{ marginTop: "auto", height: 5, background: "#ffc543", flexShrink: 0 }} />
    </div>
  );
}

/* ─── Step wrapper ──────────────────────────────────────────────── */
function StepCard({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", background: "#fff", borderRadius: 20,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
      border: "1.5px solid rgba(60,47,34,0.07)",
    }}>
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px" }}>
        <span style={{
          fontSize: 11, fontWeight: 800, color: "#FFC543",
          background: "#3c2f22", borderRadius: 6, padding: "3px 8px", flexShrink: 0,
        }}>
          {num}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3c2f22" }}>{title}</span>
      </div>
      {/* Visual */}
      <div style={{ padding: "0 16px 16px" }}>
        {children}
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
        <path d="M8 0v16M2 10l6 8 6-8" stroke="#c8b89a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

/* ─── Safari bottom bar illustration ───────────────────────────── */
function SafariBar({ highlightDots }: { highlightDots?: boolean }) {
  return (
    <div style={{
      background: "#f2f2f7",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #d1d1d6",
    }}>
      {/* Address bar */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #d1d1d6",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{
          flex: 1, background: "#f2f2f7", borderRadius: 8,
          padding: "6px 10px", fontSize: 11, color: "#888",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ color: "#34c759", fontSize: 9 }}>🔒</span>
          tradebe.app
        </div>
      </div>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px 12px",
      }}>
        {/* Back */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/></svg>
        {/* Forward (greyed) */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}><path d="M9 5l7 7-7 7" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/></svg>
        {/* Share */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v13M7 7l5-5 5 5M4 17v3h16v-3" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
        {/* Bookmarks */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v17l-8-4-8 4V4z" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
        {/* Tabs / ··· — HIGHLIGHTED */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Pulsing ring behind the button */}
          {highlightDots && (
            <span className="pulse-dot" style={{
              position: "absolute",
              width: 34, height: 34, borderRadius: "50%",
              background: "#FFC543",
              display: "flex", alignItems: "center", justifyContent: "center",
            }} />
          )}
          <div
            className={highlightDots ? "tap-anim" : ""}
            style={{
              position: "relative", zIndex: 1,
              background: highlightDots ? "#FFC543" : "transparent",
              borderRadius: 10, padding: "4px 7px",
              display: "flex", alignItems: "center", gap: 3,
              boxShadow: highlightDots ? "0 2px 8px rgba(255,197,67,0.5)" : "none",
            }}
          >
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: highlightDots ? "#3c2f22" : "#888", display: "block" }} />
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: highlightDots ? "#3c2f22" : "#888", display: "block" }} />
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: highlightDots ? "#3c2f22" : "#888", display: "block" }} />
          </div>
        </div>
      </div>
      {/* Label */}
      {highlightDots && (
        <div style={{
          textAlign: "right", padding: "0 24px 10px",
          fontSize: 11, color: "#c0392b", fontWeight: 700,
        }}>
          ← tap here
        </div>
      )}
    </div>
  );
}

/* ─── Share sheet row ───────────────────────────────────────────── */
function ShareRow() {
  const items = ["Message", "Mail", "Notes", "Reminder"];
  return (
    <div style={{
      background: "#f2f2f7",
      borderRadius: 14,
      border: "1px solid #d1d1d6",
      overflow: "hidden",
    }}>
      {/* App icon strip */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e5ea",
        padding: "12px 16px", display: "flex", gap: 16, overflowX: "auto",
      }}>
        {items.map(label => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e5e5ea" }} />
            <span style={{ fontSize: 10, color: "#888" }}>{label}</span>
          </div>
        ))}
      </div>
      {/* Action rows — highlight Share */}
      <ActionRow icon="shareIcon" label="Share" highlight />
      <ActionRow icon="copyIcon" label="Copy" />

      {/* Label */}
      <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#c0392b", fontWeight: 700 }}>
        ↑ tap Share
      </div>
    </div>
  );
}

function ActionRow({ label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "11px 16px",
      background: highlight ? "rgba(255,197,67,0.15)" : "#fff",
      borderBottom: "1px solid #e5e5ea",
      borderLeft: highlight ? "3px solid #FFC543" : "3px solid transparent",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: highlight ? "#FFC543" : "#e5e5ea",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {highlight ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2v13M7 7l5-5 5 5M4 17v3h16v-3" stroke="#3c2f22" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="8" width="13" height="13" rx="2" stroke="#888" strokeWidth="2"/>
            <path d="M9 8V5a3 3 0 016 0v3" stroke="#888" strokeWidth="2"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 14, color: highlight ? "#3c2f22" : "#555", fontWeight: highlight ? 700 : 400 }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Add to Home Screen row ────────────────────────────────────── */
function AddToHomeRow() {
  return (
    <div style={{
      background: "#f2f2f7",
      borderRadius: 14,
      border: "1px solid #d1d1d6",
      overflow: "hidden",
    }}>
      {/* Some greyed rows */}
      <GhostRow />
      <GhostRow />
      {/* Add to Home Screen — highlighted */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "11px 16px",
        background: "rgba(255,197,67,0.15)",
        borderLeft: "3px solid #FFC543",
        borderBottom: "1px solid #e5e5ea",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "#FFC543",
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#3c2f22" strokeWidth="2.8" strokeLinecap="round"/>
          </svg>
        </div>
        <span style={{ fontSize: 14, color: "#3c2f22", fontWeight: 700 }}>Add to Home Screen</span>
      </div>
      <GhostRow />

      {/* Label */}
      <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#c0392b", fontWeight: 700 }}>
        ↑ tap this, then tap "Add" (top right)
      </div>
    </div>
  );
}

function GhostRow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "11px 16px", background: "#fff",
      borderBottom: "1px solid #e5e5ea",
    }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#e5e5ea", flexShrink: 0 }} />
      <div style={{ height: 10, borderRadius: 5, background: "#e5e5ea", width: "55%", flexShrink: 0 }} />
    </div>
  );
}
