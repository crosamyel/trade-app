"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Clothing = {
  id: string | number;
  user_id: string;
  title?: string;
  brand?: string;
  size?: string;
  condition?: string;
  style?: string;
  description?: string;
  coins_value?: number;
  image_url?: string;
  image_back_url?: string;
  image_label_url?: string;
  image_detail_url?: string;
  status?: string;
};

const CONDITIONS = ["New", "Like new", "Good", "Used", "Worn"];
const STYLES = ["Casual", "Streetwear", "Vintage", "Sport", "Formal", "Minimalist"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"];

export default function EditClothingPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Champs éditables
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [style, setStyle] = useState("");
  const [description, setDescription] = useState("");
  const [coinsValue, setCoinsValue] = useState<number>(20);
  const [coinsSuggested, setCoinsSuggested] = useState<number>(20);

  // Photos — read-only après upload (non modifiables ici)
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [labelPhoto, setLabelPhoto] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { data, error: dbErr } = await supabase
        .from("clothing").select("*").eq("id", id).single();
      if (dbErr || !data) { setError("Item not found."); setLoading(false); return; }

      const item = data as Clothing;
      if (item.user_id !== user.id) { router.replace("/profile"); return; }

      setTitle(item.title ?? "");
      setBrand(item.brand ?? "");
      setSize(item.size ?? "");
      setCondition(item.condition ?? "");
      setStyle(item.style ?? "");
      setDescription(item.description ?? "");
      const suggested = calcCoins(item.condition ?? "", item.brand ?? "", item.title ?? "");
      setCoinsValue(item.coins_value ?? suggested);
      setCoinsSuggested(suggested);
      setFrontPhoto(item.image_url ?? null);
      setBackPhoto(item.image_back_url ?? null);
      setLabelPhoto(item.image_label_url ?? null);
      setLoading(false);
    }
    init();
  }, [id, router]);

  async function handleSave() {
    if (saving) return;
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const { error: dbErr } = await supabase.from("clothing").update({
        title: title.trim(),
        brand: brand.trim() || null,
        size: size || null,
        condition: condition || null,
        style: style || null,
        description: description.trim() || null,
        coins_value: coinsValue,
      }).eq("id", id);
      if (dbErr) { setError("Save failed: " + dbErr.message); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { window.location.href = "/profile"; }, 1200);
    } catch (e) {
      console.error(e);
      setError("Unexpected error.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove this item? This cannot be undone.")) return;
    try {
      // 1. Trouver tous les matches impliquant cet article
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a_uid, user_b_uid")
        .or(`clothing_a_id.eq.${id},clothing_b_id.eq.${id}`);

      // 2. Insérer un message système dans chaque chat actif
      if (matches && matches.length > 0) {
        for (const match of matches) {
          await supabase.from("messages").insert({
            match_id: match.id,
            sender_id: userId,
            body: "⚠️ SYSTEM: This user has removed one of the items involved in this trade. The trade can no longer proceed.",
          });
        }
      }

      // 3. Supprimer les likes liés à cet article
      await supabase.from("likes").delete()
        .or(`clothing_id.eq.${id},offered_clothing_id.eq.${id}`);

      // 4. Supprimer l'article définitivement
      await supabase.from("clothing").delete().eq("id", id);

      window.location.href = "/profile";
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to remove item. Please try again.");
    }
  }

  if (loading) return (
    <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <span style={{ color: "#3c2f22", opacity: 0.5, fontWeight: 600 }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100dvh", background: "#f9f4e8", fontFamily: FONT }}>

      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingBottom: 14,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ position: "relative", width: 150, height: 44 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
      </div>

      <div style={{ padding: "20px 20px 140px" }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, fontStyle: "italic", color: "#3c2f22", margin: "0 0 20px" }}>
          Edit article
        </h1>

        {/* Photos — read-only */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 10 }}>Photos</p>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Front", src: frontPhoto },
            { label: "Back", src: backPhoto },
            { label: "Label", src: labelPhoto },
          ].map(({ label, src }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{
                width: "100%", aspectRatio: "1 / 1", borderRadius: 14, overflow: "hidden",
                background: "#3c2f22", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {src
                  ? <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>—</span>
                }
              </div>
              <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 11, color: "#9b8f7a", fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Champs texte */}
        <TextField label="Title *" value={title} onChange={setTitle} placeholder="e.g. Black hoodie" />
        <TextField label="Brand" value={brand} onChange={setBrand} placeholder="e.g. Nike" />

        {/* Size — chips */}
        <ChipField label="Size" value={size} onChange={setSize} options={SIZES} />

        {/* Condition — chips */}
        <ChipField label="Condition" value={condition} onChange={setCondition} options={CONDITIONS} />

        {/* Style — chips */}
        <ChipField label="Style" value={style} onChange={setStyle} options={STYLES} />

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your item…"
            style={{ width: "100%", background: "#fff", border: "none", borderRadius: 18, padding: "12px 16px", fontSize: 15, color: "#2D1A0A", outline: "none", resize: "none", fontFamily: FONT, lineHeight: 1.5, boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
          />
        </div>

        {/* Coins value — ±15% autour de la suggestion TRADE */}
        {(() => {
          const minCoins = Math.max(5, Math.round(coinsSuggested * 0.85));
          const maxCoins = Math.min(500, Math.round(coinsSuggested * 1.15));
          const clamp = (v: number) => Math.min(maxCoins, Math.max(minCoins, v));
          const pct = coinsSuggested > 0
            ? Math.round(((coinsValue - coinsSuggested) / coinsSuggested) * 100)
            : 0;
          return (
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 6 }}>
                🪙 Coins value
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, color: "#b3a896" }}>— TRADE suggestion ±15%</span>
              </label>
              <div style={{ background: "#f0e2b8", borderRadius: 18, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setCoinsValue(v => clamp(v - 1))}
                    disabled={coinsValue <= minCoins}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: coinsValue <= minCoins ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 22, fontWeight: 800, cursor: coinsValue <= minCoins ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
                  >−</button>
                  <input
                    type="number"
                    min={minCoins} max={maxCoins}
                    value={coinsValue}
                    onChange={(e) => setCoinsValue(clamp(Number(e.target.value) || minCoins))}
                    style={{ flex: 1, height: 40, background: "#fff", border: "1.5px solid #d4b870", borderRadius: 12, textAlign: "center", fontSize: 20, fontWeight: 800, color: "#8a6d2a", outline: "none", fontFamily: FONT }}
                  />
                  <button
                    onClick={() => setCoinsValue(v => clamp(v + 1))}
                    disabled={coinsValue >= maxCoins}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: coinsValue >= maxCoins ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 22, fontWeight: 800, cursor: coinsValue >= maxCoins ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
                  >+</button>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🪙</span>
                </div>
                {/* Barre de range */}
                <input
                  type="range" min={minCoins} max={maxCoins}
                  value={coinsValue}
                  onChange={(e) => setCoinsValue(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 10, accentColor: "#3c2f22" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9a7d3a", marginTop: 2 }}>
                  <span>{minCoins} coins</span>
                  <span style={{ fontWeight: 700 }}>
                    {pct === 0 ? "TRADE suggestion" : pct > 0 ? `+${pct}%` : `${pct}%`}
                  </span>
                  <span>{maxCoins} coins</span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9a7d3a", lineHeight: 1.4 }}>
                  💡 {brand && condition
                    ? `${condition} ${brand} → ${coinsSuggested} coins suggested by TRADE`
                    : "Value calculated by TRADE based on brand and condition"}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Erreur / succès */}
        {error && <p style={{ fontSize: 13, color: "#e03c3c", textAlign: "center", marginBottom: 10 }}>{error}</p>}
        {success && <p style={{ fontSize: 14, fontWeight: 700, color: "#5d8f3c", textAlign: "center", marginBottom: 10 }}>Saved ✓</p>}

        {/* Bouton Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", height: 58, borderRadius: 29, background: saving ? "#e6ddca" : "#FFC543", border: "none", color: saving ? "#b3a896" : "#2D1A0A", fontSize: 18, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", marginBottom: 14, boxShadow: saving ? "none" : "0 6px 18px rgba(255,197,67,0.45)" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {/* Archiver */}
        <button
          onClick={handleDelete}
          style={{ width: "100%", height: 48, borderRadius: 24, background: "transparent", border: "1.5px solid rgba(224,60,60,0.35)", color: "#e03c3c", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          Remove this item
        </button>

      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", height: 50, background: "#fff", border: "none", borderRadius: 25, padding: "0 18px", fontSize: 15, color: "#2D1A0A", outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      />
    </div>
  );
}

/* Coins calculation — mirrors the formula in upload pages */
function calcCoins(condition: string, brand: string, category: string): number {
  const cat = (category ?? "").toLowerCase();
  let base = 20;
  if (cat.includes("outerwear") || cat.includes("jacket") || cat.includes("coat")) base = 40;
  else if (cat.includes("shoes") || cat.includes("sneakers") || cat.includes("boots")) base = 35;
  else if (cat.includes("dress")) base = 30;
  else if (cat.includes("bottom") || cat.includes("jeans") || cat.includes("pant")) base = 25;
  else if (cat.includes("sport")) base = 25;
  else if (cat.includes("accessori") || cat.includes("bag") || cat.includes("belt")) base = 20;
  const b = (brand ?? "").toLowerCase();
  let bm = 1.0;
  if (["gucci","louis vuitton","lv","prada","balenciaga","off-white","dior","versace","moncler","ysl","saint laurent","bottega","fendi"].some(l => b.includes(l))) bm = 4.0;
  else if (["ralph lauren","tommy hilfiger","calvin klein","hugo boss","lacoste","burberry","armani","boss"].some(p => b.includes(p))) bm = 2.5;
  else if (["nike","adidas","zara","h&m","levi","north face","stone island","carhartt","new balance","puma","reebok","jordan","converse","vans","champion"].some(p => b.includes(p))) bm = 1.8;
  else if (["primark","shein","boohoo","forever 21","asos","prettylittlething","missguided"].some(f => b.includes(f))) bm = 0.8;
  const c = (condition ?? "").toLowerCase();
  let cm = 1.0;
  if (c === "new") cm = 2.0;
  else if (c === "like_new" || c === "like new") cm = 1.6;
  else if (c === "good") cm = 1.2;
  else if (c === "used") cm = 0.8;
  else if (c === "worn") cm = 0.5;
  return Math.min(500, Math.max(5, Math.round(base * bm * cm)));
}

function ChipField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: value === opt ? "#3c2f22" : "#ede8dc",
              color: value === opt ? "#FFC543" : "#3c2f22",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
