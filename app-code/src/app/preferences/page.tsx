"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { HeaderActions } from "@/components/HeaderActions";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const CATEGORIES = ["Jackets", "Shirts", "Pants", "Shoes", "Dresses", "Accessories", "Sweaters", "T-shirts"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const STYLES = ["Streetwear", "Vintage", "Casual", "Sport", "Formal"];
const CONDITIONS = ["Good", "Like new", "New"];

export default function PreferencesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [pref_categories, setPrefCategories] = useState<string[]>([]);
  const [pref_sizes, setPrefSizes] = useState<string[]>([]);
  const [pref_styles, setPrefStyles] = useState<string[]>([]);
  const [pref_min_condition, setPrefMinCondition] = useState("");
  const [pref_min_coins, setPrefMinCoins] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("pref_categories, pref_sizes, pref_styles, pref_min_condition, pref_min_coins")
        .eq("id", user.id)
        .single();
      if (error) console.error("preferences/load:", error.message);
      if (Array.isArray(prof?.pref_categories)) setPrefCategories(prof.pref_categories);
      if (Array.isArray(prof?.pref_sizes)) setPrefSizes(prof.pref_sizes);
      if (Array.isArray(prof?.pref_styles)) setPrefStyles(prof.pref_styles);
      if (prof?.pref_min_condition) setPrefMinCondition(prof.pref_min_condition);
      if (typeof prof?.pref_min_coins === "number") setPrefMinCoins(prof.pref_min_coins);
    }
    init();
  }, [router]);

  function toggle(arr: string[], val: string, setArr: (v: string[]) => void) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      pref_categories,
      pref_sizes,
      pref_styles,
      pref_min_condition,
      pref_min_coins,
    }).eq("id", userId);
    if (error) console.error("preferences/save:", error.message);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22", flexShrink: 0,
        height: "calc(112px + env(safe-area-inset-top))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: 14,
      }}>
        <button
          onClick={() => router.back()}
          style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 24px" }}>
        <h1 style={{ margin: "0 0 24px", textAlign: "center", fontSize: 28, fontWeight: 800, fontStyle: "italic", color: "#2D1A0A" }}>My preferences</h1>

        <MultiSection title="Categories" items={CATEGORIES} value={pref_categories} onToggle={(v) => toggle(pref_categories, v, setPrefCategories)} />
        <MultiSection title="Sizes" items={SIZES} value={pref_sizes} onToggle={(v) => toggle(pref_sizes, v, setPrefSizes)} />
        <MultiSection title="Styles" items={STYLES} value={pref_styles} onToggle={(v) => toggle(pref_styles, v, setPrefStyles)} />

        {/* Min condition */}
        <div style={{ marginBottom: 26 }}>
          <h2 style={sectionTitle}>Minimum condition</h2>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(45,26,10,0.6)" }}>Only show items at least this good</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {CONDITIONS.map((c) => {
              const active = pref_min_condition === c;
              return (
                <button
                  key={c}
                  onClick={() => setPrefMinCondition(active ? "" : c)}
                  style={{ height: 38, padding: "0 18px", borderRadius: 19, border: "none", cursor: "pointer", fontSize: 14, background: active ? "#FFC543" : "#E8E4DC", color: "#2D1A0A", fontWeight: active ? 800 : 600 }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Min coins */}
        <div style={{ marginBottom: 10 }}>
          <h2 style={sectionTitle}>Minimum coins value</h2>
          <p style={{ margin: "0 0 10px", fontSize: 14, color: "#2D1A0A", fontWeight: 700 }}>
            {pref_min_coins === 0 ? "Any" : `At least ${pref_min_coins} coins`}
          </p>
          <input
            type="range" min={0} max={100} step={5} value={pref_min_coins}
            onChange={(e) => setPrefMinCoins(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#FFC543", height: 6, outline: "none" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(45,26,10,0.5)" }}>
            <span>Any</span><span>100</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ flexShrink: 0, padding: "12px 18px 36px", borderTop: "1px solid rgba(45,26,10,0.08)" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            width: "100%", height: 54, borderRadius: 27, border: "none",
            background: saved ? "#5d8f3c" : "#FFC543",
            color: saved ? "#fff" : "#2D1A0A",
            fontWeight: 800, fontSize: 17,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 6px 18px rgba(255,197,67,0.45)",
            transition: "background 0.3s, color 0.3s",
          }}
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = { margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#2D1A0A" };

function MultiSection({ title, items, value, onToggle }: {
  title: string; items: string[]; value: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={sectionTitle}>{title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {items.map((it) => {
          const active = value.includes(it);
          return (
            <button
              key={it}
              onClick={() => onToggle(it)}
              style={{ height: 38, padding: "0 18px", borderRadius: 19, border: "none", cursor: "pointer", fontSize: 14, background: active ? "#FFC543" : "#E8E4DC", color: "#2D1A0A", fontWeight: active ? 800 : 600 }}
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
}
