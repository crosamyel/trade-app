"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function DetailPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        background: "#f9f4e8",
        fontFamily: FONT,
        height: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ===== PHOTO pleine page ===== */}
      <div style={{ position: "relative", width: "100%", height: "100dvh", background: "#f9f4e8" }}>
        <Image
          src="/card-photo-01.png"
          alt="Black casual t-shirt"
          fill
          style={{ objectFit: "contain" }}
          sizes="480px"
          priority
        />

        {/* Header flottant par-dessus la photo */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "calc(68px + max(env(safe-area-inset-top, 0px), 44px))",
            background: "#3c2f22",
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingTop: "max(env(safe-area-inset-top, 0px), 44px)",
            paddingBottom: 14,
            boxSizing: "border-box",
            zIndex: 10,
          }}
        >
          <div style={{ position: "relative", width: 160, height: 48 }}>
            <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
          </div>
          <HeaderActions />
        </div>

        {/* Bouton retour */}
        <Link href="/home">
          <div
            style={{
              position: "absolute", left: 18, top: 120,
              width: 40, height: 40, borderRadius: "50%",
              background: "#f9f4e8",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              zIndex: 11, cursor: "pointer",
            }}
          >
            <ArrowBackIcon />
          </div>
        </Link>

        {/* Indicateurs photo */}
        <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: "rgba(60,47,34,0.45)", borderRadius: 2 }} />
          <div style={{ flex: 1, height: 3, background: "rgba(60,47,34,0.18)", borderRadius: 2 }} />
        </div>
      </div>

      {/* ===== CONTENU (scroll) ===== */}
      <div style={{ background: "#f9f4e8", position: "relative", paddingBottom: 32 }}>

        {/* Burst décoratif — derrière, centré, grand */}
        <div
          style={{
            position: "absolute",
            top: "5%", left: "50%",
            transform: "translateX(-50%)",
            width: 440, height: 440,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <Image src="/detail-burst.png" alt="" fill style={{ objectFit: "contain" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Titre + like */}
          <div style={{ paddingTop: 14, paddingLeft: 16, paddingRight: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontSize: 30, fontWeight: 800, fontStyle: "italic", color: "#3c2f22", margin: 0, lineHeight: 1.1, flex: 1 }}>
              Black casual t-shirt
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f9f4e8", borderRadius: 999, padding: "5px 10px 5px 6px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", marginTop: 2, flexShrink: 0 }}>
              <button onClick={() => setSaved(s => !s)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <StarSmallIcon filled={saved} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#3c2f22" }}>18</span>
            </div>
          </div>

          {/* Tags */}
          <div style={{ paddingLeft: 16, paddingRight: 16, marginTop: 12, display: "flex", gap: 10 }}>
            <TagPill bg="#3c2f22" color="white">Size M</TagPill>
            <TagPill bg="#a4d4a7" color="#105713">Good state</TagPill>
            <TagPill bg="#f0e1b1" color="#91691a">10 coins</TagPill>
          </div>

          {/* Carte profil */}
          <div
            style={{
              marginLeft: 14, marginRight: 14, marginTop: 16,
              background: "#3c2f22",
              borderRadius: 999,
              padding: "16px 18px 16px 16px",
              display: "flex", gap: 14, alignItems: "flex-start",
            }}
          >
            {/* Avatar */}
            <div style={{ width: 78, height: 78, borderRadius: "50%", background: "#f0e1b1", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 42, fontWeight: 800, fontStyle: "italic", color: "#7f5d19", lineHeight: 1, userSelect: "none" }}>J</span>
            </div>

            {/* Infos — deux colonnes */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 32, alignItems: "flex-start" }}>

              {/* Colonne gauche : José / ★ / trades */}
              <div style={{ flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 33, fontWeight: 700, fontStyle: "italic", color: "white", lineHeight: 1 }}>
                  José
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <StarFilled size={26} />
                  <span style={{ fontSize: 28, fontWeight: 700, fontStyle: "italic", color: "#ffb92e", lineHeight: 1 }}>4.9</span>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>12 trades done</p>
              </div>

              {/* Colonne droite : Brussels + View profile */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 4 }}>
                <p style={{ margin: 0, fontSize: 15, color: "white", fontWeight: 500 }}>📍 Brussels</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>1.2 km away from you</p>
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#ffb92e", borderRadius: 999,
                    padding: "6px 12px",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 13 }}>👁️</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3c2f22" }}>View profile</span>
                  <ArrowRightSmall />
                </div>
              </div>

            </div>
          </div>

          {/* Description — remonté */}
          <div
            style={{
              marginLeft: 14, marginRight: 14, marginTop: 10,
              background: "#3c2f22",
              borderRadius: 999,
              padding: "16px 24px 18px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "rgba(255,185,46,0.9)" }}>Description</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.74)", lineHeight: 1.55 }}>
              A versatile Next Essential black crew-neck t-shirt in a comfortable regular fit, crafted from soft, breathable cotton for effortless everyday styling.
            </p>
          </div>

          {/* Boutons CTA */}
          <div style={{ paddingLeft: 14, paddingRight: 14, marginTop: 10, display: "flex", gap: 10 }}>

            {/* Send a message — centré avec shadow */}
            <button
              style={{
                flex: 1, height: 72,
                background: "#f9f4e8",
                border: "2.5px solid #ffc543",
                borderRadius: 999,
                display: "flex", flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(0,0,0,0.13)",
              }}
            >
              <MsgIconYellow />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#c08612", lineHeight: 1.3, textAlign: "left" }}>
                Send a<br />message
              </span>
            </button>

            {/* Claim for 10 coins */}
            <button
              style={{
                flex: 1, height: 72,
                background: "#ffb92e",
                border: "none",
                borderRadius: 999,
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: "#3c2f22", lineHeight: 1.25, textAlign: "left" }}>
                Claim for<br />
                <span style={{ fontStyle: "italic", fontWeight: 800 }}>10 coins</span>
              </span>
              <ArrowRightBold />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ---- Composants ---- */

function TagPill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, borderRadius: 999, padding: "6px 16px", fontSize: 16, fontWeight: 500, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

/* ---- Icônes ---- */

function ArrowBackIcon() {
  return (
    <svg width="20" height="16" viewBox="0 0 22 16" fill="none">
      <path d="M21 8H1M1 8L8 1M1 8L8 15" stroke="#3c2f22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarSmallIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="19" viewBox="0 0 22 21" fill="none">
      <path d="M11 1.5L13.8 8.3L21 9.1L15.8 13.9L17.4 21L11 17.3L4.6 21L6.2 13.9L1 9.1L8.2 8.3L11 1.5Z"
        fill={filled ? "#ffc543" : "rgba(255,197,67,0.15)"}
        stroke="#ffc543" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarFilled({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 21" fill="#ffc543">
      <path d="M11 1.5L13.8 8.3L21 9.1L15.8 13.9L17.4 21L11 17.3L4.6 21L6.2 13.9L1 9.1L8.2 8.3L11 1.5Z" />
    </svg>
  );
}

function ArrowRightSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M1 6h10M7 2l4 4-4 4" stroke="#3c2f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightBold() {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
      <path d="M1 11H27M27 11L16 1M27 11L16 21" stroke="#3c2f22" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MsgIconYellow() {
  return (
    <svg width="38" height="34" viewBox="0 0 28 24" fill="none">
      <rect x="3" y="3" width="18" height="13" rx="2.5" stroke="#ffc543" strokeWidth="2.2" opacity="0.5" />
      <rect x="7" y="7" width="18" height="13" rx="2.5" stroke="#ffc543" strokeWidth="2.2" />
      <path d="M7 7l9 6 9-6" stroke="#ffc543" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
