"use client";

import Image from "next/image";

export type CardData = {
  id: string;
  photo: string;
  photoCount?: number;
  photoIdx?: number;
  title: string;
  location: string;
  username: string;
  views: number;
  distance: string;
  size: string;
  condition: string;
};

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function SwipeCard({ card, height }: { card: CardData; height?: number | string }) {
  return (
    <div
      style={{
        width: "100%",
        height: height ?? 556,
        borderRadius: 30,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        fontFamily: FONT,
      }}
    >
      {/* Photo plein-fond */}
      <Image
        src={card.photo}
        alt={card.title}
        fill
        style={{ objectFit: "cover" }}
        sizes="306px"
        priority
      />

      {/* Gradient sombre en bas */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 28%, rgba(12,6,2,0.94) 100%)",
          zIndex: 1,
        }}
      />

      {/* Deux lignes décoratives en haut */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          gap: 8,
          zIndex: 3,
        }}
      >
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
      </div>

      {/* Indicateurs pagination — dynamiques selon le nombre de photos */}
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 5,
          zIndex: 3,
        }}
      >
        {Array.from({ length: Math.max(card.photoCount ?? 1, 1) }).map((_, i) => (
          <div key={i} style={{ width: 22, height: 4, borderRadius: 2, background: i === (card.photoIdx ?? 0) ? "white" : "rgba(255,255,255,0.32)" }} />
        ))}
      </div>

      {/* Titre de l'article */}
      <div
        style={{ position: "absolute", bottom: 104, left: 16, right: 16, zIndex: 5 }}
      >
        <p
          style={{
            fontSize: "clamp(22px, 8vw, 32px)",
            fontWeight: 800,
            fontStyle: "italic",
            color: "white",
            letterSpacing: "-0.5px",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {card.title}
        </p>
      </div>

      {/* Pills info sur photo: localisation / @user / vues */}
      <div
        style={{
          position: "absolute",
          bottom: 62,
          left: 16,
          display: "flex",
          gap: 6,
          zIndex: 5,
        }}
      >
        <InfoPill>
          <LocationIcon /> {card.location}
        </InfoPill>
        <InfoPill>
          <UserIcon /> @{card.username}
        </InfoPill>
        <InfoPill>
          <EyeIcon /> {card.views}
        </InfoPill>
      </div>

      {/* Pills distance / taille / état — jaune transparent, pleine largeur */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 14,
          right: 14,
          display: "flex",
          gap: 8,
          zIndex: 5,
        }}
      >
        <YellowPill icon={<LocationIcon />} flex>{card.distance}</YellowPill>
        <YellowPill icon={<SizeIcon />} flex>{card.size}</YellowPill>
        <YellowPill icon={<SparkIcon />} flex>{card.condition}</YellowPill>
      </div>
    </div>
  );
}

/* ---- sous-composants ---- */

function InfoPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "rgba(45,28,16,0.52)",
        backdropFilter: "blur(6px)",
        color: "white",
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 9px",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function YellowPill({ icon, children, flex }: { icon: React.ReactNode; children: React.ReactNode; flex?: boolean }) {
  return (
    <span
      style={{
        background: "rgba(255,197,67,0.30)",
        backdropFilter: "blur(6px)",
        color: "white",
        fontSize: 11,
        fontWeight: 600,
        padding: "7px 8px",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        border: "1px solid rgba(255,197,67,0.45)",
        whiteSpace: "nowrap",
        ...(flex ? { flex: 1 } : {}),
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function LocationIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
      <path d="M4.5 0C2.29 0 .5 1.79.5 4c0 3 4 7 4 7s4-4 4-7c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 114.5 2.5a1.5 1.5 0 010 3z" fill="white" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <circle cx="5.5" cy="3.5" r="2.5" fill="white" />
      <path d="M.5 10.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="white" strokeWidth="1.2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="9" viewBox="0 0 13 9" fill="none">
      <path d="M6.5.5C3.5.5 1 3 .5 4.5c.5 1.5 3 4 6 4s5.5-2.5 6-4C12 3 9.5.5 6.5.5z" fill="white" />
      <circle cx="6.5" cy="4.5" r="1.8" fill="rgba(45,28,16,0.55)" />
    </svg>
  );
}

function SizeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x=".5" y="3.5" width="11" height="5" rx="1" stroke="white" strokeWidth="1.2" />
      <path d="M3 3.5V6M6 3.5V7M9 3.5V6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="white">
      <path d="M5.5 0l1.1 3.9H10l-2.8 2 1 3.5L5.5 7.5 3.8 9.4l1-3.5L2 3.9h3.4L5.5 0z" />
    </svg>
  );
}
