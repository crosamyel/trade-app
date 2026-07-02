"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type ItemResult = {
  id: number;
  photoDataUrl: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  condition: string;
  style: string;
  description: string;
  coins_value: number | null;
  analyzing: boolean;
  error: string;
};

export default function MultiUploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"pick" | "review" | "publishing">("pick");
  const [items, setItems] = useState<ItemResult[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [publishError, setPublishError] = useState("");
  const [notClothingError, setNotClothingError] = useState(false);

  useEffect(() => {
    if (phase !== "review") return;
    if (items.length === 0) { setPhase("pick"); return; }
    setReviewIndex((prev) => Math.min(prev, items.length - 1));
  }, [items.length, phase]);

  async function compress(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function analyzeOne(dataUrl: string): Promise<Partial<ItemResult>> {
    try {
      const comp = await compress(dataUrl);
      const res = await fetch("/api/analyze-clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: comp }),
      });
      const data = await res.json();
      if (res.status === 422 && data.error === 'not_clothing') return { error: "not_clothing" };
      if (!res.ok || data.error) return { error: data.reason ?? "Analysis failed" };
      return {
        category: data.category ?? "",
        brand: data.brand ?? "",
        size: data.size ?? "",
        color: data.color ?? "",
        condition: data.condition ?? "",
        style: data.style ?? "",
        description: data.description ?? "",
        coins_value: typeof data.coins_value === "number" ? data.coins_value : null,
        error: "",
      };
    } catch {
      return { error: "Network error" };
    }
  }

  function handleFiles(files: FileList) {
    const list = Array.from(files).slice(0, 12);
    const initial: ItemResult[] = list.map((_, i) => ({
      id: i,
      photoDataUrl: "", category: "", brand: "", size: "", color: "",
      condition: "", style: "", description: "", coins_value: null, analyzing: true, error: "",
    }));
    setItems(initial);
    setPhase("review");
    setReviewIndex(0);

    list.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const result = await analyzeOne(dataUrl);
        if (result.error === "not_clothing") {
          setItems((prev) => prev.filter((item) => item.id !== i));
          setNotClothingError(true);
          return;
        }
        setItems((prev) => {
          const next = [...prev];
          const idx = next.findIndex((item) => item.id === i);
          if (idx === -1) return next;
          next[idx] = { ...next[idx], photoDataUrl: dataUrl, analyzing: false, ...result };
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function updateItem(i: number, patch: Partial<ItemResult>) {
    setItems((prev) => { const n = [...prev]; n[i] = { ...n[i], ...patch }; return n; });
  }

  async function publishAll() {
    setPhase("publishing");
    setPublishError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPublishError("Not logged in."); setPhase("review"); return; }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.photoDataUrl || item.analyzing) continue;
      // Upload photo
      const [header, base64] = item.photoDataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1] ?? "jpg";
      const path = `${user.id}/${Date.now()}_${idx}_front.${ext}`;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mimeType });
      const { error: upErr } = await supabase.storage.from("clothing-images").upload(path, blob, { contentType: mimeType, upsert: true });
      if (upErr) { setPublishError("Upload failed for " + (item.category ?? "an item")); setPhase("review"); return; }
      const { data: pub } = supabase.storage.from("clothing-images").getPublicUrl(path);

      await supabase.from("clothing").insert({
        user_id: user.id,
        title: item.category || "Article",
        brand: item.brand || null,
        size: item.size || null,
        condition: item.condition || null,
        style: item.style || null,
        category: item.category || null,
        description: item.description || null,
        image_url: pub.publicUrl,
        status: "active",
        coins_value: item.coins_value ?? 20,
      });
    }
    router.push("/profile");
  }

  if (phase === "pick") {
    return (
      <div style={{ width: "100%", minHeight: "100dvh", background: "#f9f4e8", fontFamily: FONT }}>
        <HeaderBar onBack={() => router.back()} title="Multiple items" />
        <div style={{ padding: "24px 24px 140px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ fontSize: 15, color: "#7a6f5d", textAlign: "center", lineHeight: 1.6, marginBottom: 32 }}>
            Select up to 12 photos.<br />AI will analyze each item separately.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: 180, height: 180, borderRadius: 30, border: "2.5px dashed #b89b6e", background: "#3c2f22", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}
          >
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none"><rect x="6" y="16" width="44" height="30" rx="6" stroke="#FFC543" strokeWidth="3" /><circle cx="28" cy="31" r="8" stroke="#FFC543" strokeWidth="3" /><path d="M22 20L26 14H30L34 20" stroke="#FFC543" strokeWidth="3" strokeLinecap="round" /></svg>
            <span style={{ color: "#FFC543", fontWeight: 700, fontSize: 15 }}>Choose photos</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && handleFiles(e.target.files)} style={{ display: "none" }} />
        </div>
      </div>
    );
  }

  if (phase === "publishing") {
    return (
      <div style={{ width: "100%", height: "100dvh", background: "#f9f4e8", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 48 }}>📦</span>
        <p style={{ fontWeight: 700, fontSize: 18, color: "#3c2f22" }}>Publication en cours…</p>
        {publishError && <p style={{ color: "#e03c3c", fontSize: 14 }}>{publishError}</p>}
      </div>
    );
  }

  // Phase review
  if (items.length === 0) return null;
  const safeIndex = Math.min(reviewIndex, items.length - 1);
  const current = items[safeIndex];
  const total = items.length;

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: "#f9f4e8", fontFamily: FONT }}>
      <style>{`@keyframes ncfade { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }`}</style>
      {notClothingError && (
        <div
          onAnimationEnd={() => setNotClothingError(false)}
          style={{
            position: "fixed",
            top: "calc(68px + max(env(safe-area-inset-top), 44px) + 12px)",
            left: 16, right: 16, zIndex: 200,
            background: "linear-gradient(135deg, #e03c3c, #f97316)",
            color: "#fff", borderRadius: 12, padding: 16,
            fontSize: 14, fontWeight: 600, lineHeight: 1.5,
            boxShadow: "0 4px 20px rgba(224,60,60,0.4)",
            animation: "ncfade 4s ease-out forwards",
          }}
        >
          ⚠️ This doesn&apos;t look like a clothing item. Please upload a clear photo of the item you want to trade.
        </div>
      )}
      <HeaderBar onBack={() => setPhase("pick")} title={`Article ${safeIndex + 1} / ${total}`} />

      {/* Indicateurs */}
      <div style={{ display: "flex", gap: 6, padding: "12px 24px 0", justifyContent: "center" }}>
        {items.map((_, i) => (
          <button key={i} onClick={() => setReviewIndex(i)} style={{ width: 28, height: 6, borderRadius: 3, border: "none", cursor: "pointer", background: i === safeIndex ? "#3c2f22" : "#d9d0c4", padding: 0 }} />
        ))}
      </div>

      <div style={{ padding: "14px 20px 140px" }}>
        {/* Photo */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 24, overflow: "hidden", background: "#3c2f22", marginBottom: 18 }}>
          {current.photoDataUrl
            ? <img src={current.photoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Loading…</span></div>
          }
          {current.analyzing && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#FFC543", fontWeight: 700, fontSize: 15 }}>Analyzing…</span>
            </div>
          )}
        </div>

        {!current.analyzing && (
          <>
            {/* Champs éditables */}
            <SimpleField label="Category" value={current.category} onChange={(v) => updateItem(reviewIndex, { category: v })} />
            <SimpleField label="Brand" value={current.brand} onChange={(v) => updateItem(reviewIndex, { brand: v })} />
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><SimpleField label="Size" value={current.size} onChange={(v) => updateItem(reviewIndex, { size: v })} /></div>
              <div style={{ flex: 1 }}><SimpleField label="Condition" value={current.condition} onChange={(v) => updateItem(reviewIndex, { condition: v })} /></div>
            </div>
            {/* Description read-only */}
            {current.description && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <label style={{ fontSize: 13, color: "#7a6f5d", fontWeight: 600 }}>Description</label>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3a7bd5" }}>🔒 AI</span>
                </div>
                <div style={{ background: "#eef4fb", borderRadius: 16, padding: "10px 14px", border: "1.5px solid #c5d9ef" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#2A2A2A", lineHeight: 1.6 }}>{current.description}</p>
                </div>
              </div>
            )}
            {current.error && <p style={{ color: "#e03c3c", fontSize: 13, marginBottom: 14 }}>⚠ {current.error} — you can still fill it in manually.</p>}
          </>
        )}
      </div>

      {/* Barre de navigation bas */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#f9f4e8", padding: "12px 20px calc(18px + env(safe-area-inset-bottom))", display: "flex", gap: 10 }}>
        <button
          disabled={safeIndex === 0}
          onClick={() => setReviewIndex((i) => i - 1)}
          style={{ flex: 1, height: 50, borderRadius: 25, border: "none", background: safeIndex === 0 ? "#e6ddca" : "#ede8dc", color: safeIndex === 0 ? "#b3a896" : "#3c2f22", fontWeight: 700, fontSize: 15, cursor: safeIndex === 0 ? "not-allowed" : "pointer" }}
        >← Previous</button>
        {safeIndex < total - 1
          ? <button onClick={() => setReviewIndex((i) => i + 1)} style={{ flex: 2, height: 50, borderRadius: 25, border: "none", background: "#3c2f22", color: "#FFC543", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Next →</button>
          : <button onClick={publishAll} disabled={items.some(it => it.analyzing)} style={{ flex: 2, height: 50, borderRadius: 25, border: "none", background: items.some(it => it.analyzing) ? "#e6ddca" : "#FFC543", color: items.some(it => it.analyzing) ? "#b3a896" : "#2D1A0A", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 6px 18px rgba(255,197,67,0.4)" }}>Publish all ({total})</button>
        }
      </div>
    </div>
  );
}

function HeaderBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "#3c2f22", height: "calc(68px + max(env(safe-area-inset-top), 44px))", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, display: "flex", alignItems: "flex-end", paddingTop: "max(env(safe-area-inset-top), 44px)", paddingBottom: 14, paddingLeft: 16, paddingRight: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 12 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, flex: 1 }}>{title}</span>
        <div style={{ position: "relative", width: 80, height: 28 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
      </div>
      <div style={{ height: "calc(68px + max(env(safe-area-inset-top), 44px))" }} />
    </>
  );
}

function SimpleField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a6f5d", marginBottom: 5 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", height: 46, background: "#fff", border: "none", borderRadius: 23, padding: "0 16px", fontSize: 15, color: "#2D1A0A", outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }} />
    </div>
  );
}
