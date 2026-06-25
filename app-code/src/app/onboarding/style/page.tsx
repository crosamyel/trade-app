"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const STYLES = ["Streetwear", "Vintage", "Minimal", "Gore-tex", "Relaxed", "Classy"];

export default function OnboardingStyle() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleNext() {
    localStorage.setItem("trade_onboarded", "1");
    router.push("/login");
  }

  function toggle(style: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(style) ? next.delete(style) : next.add(style);
      return next;
    });
  }

  return (
    <div
      className="page-enter relative bg-[#f9f4e8]"
      style={{ width: "100%", height: "max(100dvh, 920px)", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: FONT }}
    >

      {/* Titre centré */}
      <div className="absolute" style={{ top: 100, left: 24, right: 24 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.2,
            color: "#3c2f22",
            textAlign: "center",
          }}
        >
          What <em style={{ fontStyle: "italic" }}>style</em> are you<br />looking for
        </h1>
      </div>

      {/* Soulignement sous "style" */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 136, top: 134, width: 96, height: 12 }}
      >
        <Image src="/onb-underline-style.png" alt="" fill className="object-contain" />
      </div>

      {/* "Select" centré */}
      <div className="absolute" style={{ top: 162, left: 0, right: 0 }}>
        <p style={{ fontSize: 22, fontStyle: "italic", color: "#3c2f22", opacity: 0.55, textAlign: "center" }}>
          Select
        </p>
      </div>

      {/* Scribble décoratif — derrière les boutons, plus petit */}
      <div
        className="absolute pointer-events-none"
        style={{ right: -20, bottom: 70, width: 230, height: 245, zIndex: 0 }}
      >
        <Image src="/onb-scribble.png" alt="" fill className="object-contain" />
      </div>

      {/* Liste des 6 boutons style */}
      <div
        className="absolute flex flex-col"
        style={{
          top: 196,
          left: 30,
          right: 30,
          gap: 20,
          zIndex: 5,
        }}
      >
        {STYLES.map((style) => {
          const isSelected = selected.has(style);
          return (
            <button
              key={style}
              onTouchEnd={(e) => { e.preventDefault(); toggle(style); }}
              onClick={() => toggle(style)}
              style={{
                height: 62,
                borderRadius: 46,
                touchAction: "manipulation",
                background: isSelected ? "#ffc543" : "#ede7d9",
                boxShadow: isSelected
                  ? "0 0 0 2.5px #ffb92e, 0 0 22px 8px rgba(255,185,46,0.38)"
                  : "0 4px 12px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s, box-shadow 0.15s",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: isSelected ? 700 : 500,
                  color: "#3c2f22",
                  letterSpacing: "-0.3px",
                }}
              >
                {style}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bouton "Next" */}
      <div
        className="absolute"
        style={{ bottom: "calc(48px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: 226, zIndex: 20 }}
      >
        <button
          type="button"
          onTouchEnd={(e) => { e.preventDefault(); handleNext(); }}
          onClick={handleNext}
          style={{
            width: "100%", background: "#3c2f22", border: "none",
            borderRadius: 85, height: 61, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "manipulation",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: "#ffb92e", letterSpacing: "-0.3px" }}>
            Next
          </span>
        </button>
      </div>
    </div>
  );
}
