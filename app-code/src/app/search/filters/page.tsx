"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const CATEGORIES = ["All", "Jackets", "Shirts", "Pants", "Shoes", "Dresses", "Accessories"];
const STYLES = ["Streetwear", "Vintage", "Casual", "Sport", "Formal"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const CONDITIONS = ["New", "Like new", "Good"];
const COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#1c1c1c" }, { name: "White", hex: "#ffffff" }, { name: "Grey", hex: "#9a9a9a" },
  { name: "Beige", hex: "#d8cdb5" }, { name: "Brown", hex: "#6b4a2b" }, { name: "Blue", hex: "#3a7bd5" },
  { name: "Green", hex: "#5d8f3c" }, { name: "Red", hex: "#d94040" }, { name: "Yellow", hex: "#FFC543" },
  { name: "Pink", hex: "#e58fb0" }, { name: "Orange", hex: "#D97A3A" }, { name: "Purple", hex: "#8a5fb0" },
];

export default function FiltersPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [style, setStyle] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState(0); // 0 = any

  // Pre-fill from URL (already-active filters)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCategory(p.get("category") ?? "");
    setStyle(p.get("style") ?? "");
    setColor(p.get("color") ?? "");
    setSize(p.get("size") ?? "");
    setCondition(p.get("condition") ?? "");
    setPrice(Number(p.get("price") ?? 0));
  }, []);

  function apply() {
    const p = new URLSearchParams();
    if (category && category !== "All") p.set("category", category);
    if (style) p.set("style", style);
    if (color) p.set("color", color);
    if (size) p.set("size", size);
    if (condition) p.set("condition", condition);
    if (price > 0) p.set("price", String(price));
    router.push(`/search?${p.toString()}`);
  }

  function reset() {
    setCategory(""); setStyle(""); setColor(""); setSize(""); setCondition(""); setPrice(0);
  }

  const total = [category && category !== "All", style, color, size, condition, price > 0].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22", flexShrink: 0,
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingLeft: 18, paddingRight: 18, paddingBottom: 16,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ color: "#FFC543", fontWeight: 800, fontSize: 22 }}>Filters</span>
        <button onClick={reset} style={{ position: "absolute", right: 16, bottom: 16, background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "underline" }}>
          Reset
        </button>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 24px" }}>
        <Section title="Category" items={CATEGORIES} value={category} onPick={setCategory} />
        <Section title="Style" items={STYLES} value={style} onPick={setStyle} />

        {/* Color */}
        <div style={{ marginBottom: 26 }}>
          <h2 style={sectionTitle}>Color</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {COLORS.map((c) => {
              const active = color === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setColor(active ? "" : c.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px 0 10px",
                    borderRadius: 19, cursor: "pointer", fontSize: 14,
                    border: active ? "2px solid #FFC543" : "2px solid transparent",
                    background: active ? "#FFF8E7" : "#E8E4DC",
                    color: "#2D1A0A", fontWeight: active ? 800 : 600,
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: c.hex, border: "1px solid rgba(45,26,10,0.2)" }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <Section title="Size" items={SIZES} value={size} onPick={setSize} />
        <Section title="Condition" items={CONDITIONS} value={condition} onPick={setCondition} />

        {/* Price */}
        <div style={{ marginBottom: 10 }}>
          <h2 style={sectionTitle}>Price</h2>
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "#2D1A0A", fontWeight: 700 }}>
            {price === 0 ? "Any price" : `Up to ${price} coins`}
          </p>
          <input
            type="range" min={0} max={100} step={5} value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#FFC543", height: 6, outline: "none" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(45,26,10,0.5)" }}>
            <span>Any</span><span>100</span>
          </div>
        </div>
      </div>

      {/* Apply */}
      <div style={{ flexShrink: 0, padding: "12px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid rgba(45,26,10,0.08)" }}>
        <button onClick={apply} style={{ width: "100%", height: 54, borderRadius: 27, border: "none", background: "#FFC543", color: "#2D1A0A", fontWeight: 800, fontSize: 17, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,197,67,0.45)" }}>
          See results{total > 0 ? ` (${total})` : ""}
        </button>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = { margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: "#2D1A0A" };

/* One filter section: title + chips (single choice, re-click clears) */
function Section({ title, items, value, onPick }: {
  title: string; items: string[]; value: string; onPick: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {items.map((it) => {
          const active = value === it;
          return (
            <button
              key={it}
              onClick={() => onPick(active ? "" : it)}
              style={{
                height: 38, padding: "0 18px", borderRadius: 19, border: "none", cursor: "pointer",
                fontSize: 14, whiteSpace: "nowrap",
                background: active ? "#FFC543" : "#E8E4DC",
                color: "#2D1A0A", fontWeight: active ? 800 : 600,
              }}
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
}
