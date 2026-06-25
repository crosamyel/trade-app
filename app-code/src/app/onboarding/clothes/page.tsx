"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* Toutes les images rentrent dans la carte (top positif = depuis le haut de la carte) */
const CATEGORIES = [
  {
    label: "Jackets",
    images: [
      { src: "/clothes-06.png", w: 84, h: 106, cx: -22, top: 14, rotate: -9 },
      { src: "/clothes-04.png", w: 68, h: 86,  cx: 24,  top: 26, rotate: 11 },
    ],
  },
  {
    label: "Pants",
    images: [
      { src: "/clothes-08.png", w: 88, h: 112, cx: 0, top: 10, rotate: 4 },
    ],
  },
  {
    label: "Sweaters",
    images: [
      { src: "/clothes-01.png", w: 82, h: 92,  cx: -20, top: 14, rotate: -6 },
      { src: "/clothes-02.png", w: 68, h: 86,  cx: 24,  top: 26, rotate: 13 },
    ],
  },
  {
    label: "T-shirts",
    images: [
      { src: "/clothes-05.png", w: 96, h: 86, cx: 0, top: 16, rotate: 3 },
    ],
  },
  {
    label: "Shoes",
    images: [
      { src: "/clothes-07.png", w: 96, h: 88, cx: -18, top: 14, rotate: -10 },
      { src: "/clothes-09.png", w: 80, h: 90, cx: 24,  top: 24, rotate: 8  },
    ],
  },
  {
    label: "Accessories",
    images: [
      { src: "/onb-accessory-watch.png",    w: 80, h: 80, cx: -18, top: 16, rotate: -5 },
      { src: "/onb-accessory-bracelet.png", w: 66, h: 70, cx: 24,  top: 30, rotate: 12 },
    ],
  },
];

const CARD_H = 143;

export default function OnboardingClothes() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }

  return (
    <div
      className="page-enter relative bg-[#f9f4e8]"
      style={{ width: "100%", height: "max(100dvh, 880px)", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: FONT }}
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
          What type of{" "}
          <em style={{ fontStyle: "italic" }}>clothing</em> are you{" "}
          <em style={{ fontStyle: "italic" }}>trading?</em>
        </h1>
      </div>

      {/* Soulignements sous "clothing" et "trading" */}
      <div className="absolute pointer-events-none" style={{ left: 242, top: 134, width: 122, height: 10 }}>
        <Image src="/onb-underline-clothing.png" alt="" fill className="object-contain" />
      </div>
      <div className="absolute pointer-events-none" style={{ left: 208, top: 171, width: 105, height: 10 }}>
        <Image src="/onb-underline-trading.png" alt="" fill className="object-contain" />
      </div>

      {/* "Select" centré */}
      <div className="absolute" style={{ top: 200, left: 0, right: 0 }}>
        <p style={{ fontSize: 22, fontStyle: "italic", color: "#3c2f22", opacity: 0.55, textAlign: "center" }}>
          Select
        </p>
      </div>

      {/* Étoile — encore plus bas */}
      <div
        className="absolute pointer-events-none"
        style={{ left: -80, bottom: -30, width: 300, height: 260, zIndex: 0 }}
      >
        <Image src="/onb-star.png" alt="" fill className="object-contain" />
      </div>

      {/* Grille 2×3 — cartes plus étroites, images à l'intérieur */}
      <div
        className="absolute grid grid-cols-2"
        style={{ top: 234, left: 66, right: 66, gap: 12, zIndex: 5 }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selected.has(cat.label);
          return (
            <button
              key={cat.label}
              onTouchEnd={(e) => { e.preventDefault(); toggle(cat.label); }}
              onClick={() => toggle(cat.label)}
              className="relative"
              style={{
                height: CARD_H,
                touchAction: "manipulation",
                borderRadius: 37,
                background: isSelected ? "#ffc543" : "#ede7d9",
                boxShadow: isSelected
                  ? "0 0 0 2.5px #ffb92e, 0 0 24px 10px rgba(255,185,46,0.45)"
                  : "0 4px 12px rgba(0,0,0,0.10)",
                overflow: "hidden",
                transition: "box-shadow 0.18s, background 0.18s",
              }}
            >
              {/* Images à l'intérieur de la carte */}
              {cat.images.map((img, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${img.cx}px - ${img.w / 2}px)`,
                    top: img.top,
                    width: img.w,
                    height: img.h,
                    transform: `rotate(${img.rotate}deg)`,
                    zIndex: 2 + i,
                  }}
                >
                  <Image src={img.src} alt="" fill sizes="80px" className="object-contain drop-shadow-md" />
                </div>
              ))}

              {/* Label en bas */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center" style={{ paddingBottom: 10, zIndex: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontStyle: "italic", color: "#3c2f22" }}>
                  {cat.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bouton "Next" */}
      <div
        className="absolute"
        style={{ bottom: "calc(48px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", width: 226, zIndex: 20 }}
      >
        <Link href="/onboarding/style" className="block">
          <div
            style={{
              background: "#3c2f22",
              borderRadius: 85,
              height: 61,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: "#ffb92e", letterSpacing: "-0.3px" }}>
              Next
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
