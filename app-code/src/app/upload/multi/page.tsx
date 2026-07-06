"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One size"];
const CONDITIONS = ["New", "Like new", "Good", "Used", "Worn"];
const UPLOAD_COLORS: { name: string; hex: string }[] = [
  { name: "Black",  hex: "#1c1c1c" }, { name: "White",  hex: "#f0ede8" },
  { name: "Grey",   hex: "#9a9a9a" }, { name: "Beige",  hex: "#d8cdb5" },
  { name: "Brown",  hex: "#6b4a2b" }, { name: "Blue",   hex: "#3a7bd5" },
  { name: "Green",  hex: "#5d8f3c" }, { name: "Red",    hex: "#d94040" },
  { name: "Yellow", hex: "#FFC543" }, { name: "Pink",   hex: "#e58fb0" },
  { name: "Orange", hex: "#D97A3A" }, { name: "Purple", hex: "#8a5fb0" },
];
function normalizeColor(aiColor: string): string {
  const c = (aiColor ?? "").toLowerCase().trim();
  const map: [string[], string][] = [
    [["black","noir","zwart","negro","schwarz","dark"], "Black"],
    [["white","blanc","wit","blanco","cream","ivoire","ivory"], "White"],
    [["grey","gray","gris","grijs","grau","silver"], "Grey"],
    [["beige","sand","sable","camel","ecru","taupe"], "Beige"],
    [["brown","marron","bruin","braun","tan","caramel","chocolate"], "Brown"],
    [["blue","bleu","blauw","blau","navy","marine","indigo","denim"], "Blue"],
    [["green","vert","groen","grün","grun","khaki","olive"], "Green"],
    [["red","rouge","rood","rot","burgundy","bordeaux","wine"], "Red"],
    [["yellow","jaune","geel","gelb","gold","mustard"], "Yellow"],
    [["pink","rose","roze","rosa","fuchsia","magenta","salmon"], "Pink"],
    [["orange","oranje"], "Orange"],
    [["purple","violet","lila","mauve","lavender","lilac"], "Purple"],
  ];
  for (const [aliases, standard] of map) {
    if (aliases.some((a) => c.includes(a))) return standard;
  }
  return "";
}

type PhotoGroup = {
  id: number;
  /** Indices into rawPhotos[] that belong to this group */
  photoIndices: number[];
  /** Index within photoIndices pointing to the front photo */
  frontSubIdx: number;
  /** Index within photoIndices pointing to the label photo, or null */
  labelSubIdx: number | null;
  /** Which photo within photoIndices is currently displayed large */
  activeSubIdx: number;
  /** Analysis state */
  analyzing: boolean;
  analyzed: boolean;
  title: string;
  category: string;
  brand: string;
  size: string;
  color: string;
  condition: string;
  style: string;
  description: string;
  coins_value: number | null;
  coins_suggested: number | null;   // valeur originale proposée par l'IA (pour le reset)
  coins_reason: string | null;      // explication du calcul
  error: string;
};

/* ─────────────────────────────────────────────────────────────────── */
export default function MultiUploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"pick" | "grouping" | "review" | "publishing">("pick");
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [groupingStatus, setGroupingStatus] = useState("Analysing your photos…");
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [publishError, setPublishError] = useState("");

  /* ── Helpers ───────────────────────────────────────────────────── */
  async function compress(dataUrl: string, maxPx = 1024): Promise<string> {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function patchGroup(id: number, patch: Partial<PhotoGroup>) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  /* ── File selection ────────────────────────────────────────────── */
  async function handleFiles(files: FileList) {
    const list = Array.from(files).slice(0, 12);
    if (list.length === 0) return;

    /* 1. Read all files into data URLs */
    const dataUrls: string[] = await Promise.all(
      list.map(
        (file) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(file);
          })
      )
    );
    setRawPhotos(dataUrls);
    setPhase("grouping");
    setGroupingStatus("Compressing photos…");

    /* 2. Compress for AI (smaller = faster) */
    const compressed = await Promise.all(dataUrls.map((u) => compress(u, 768)));
    setGroupingStatus(`Grouping ${dataUrls.length} photos by item…`);

    /* 3. Call group-photos API */
    let groupData: { groups: { photos: number[]; front: number; label: number | null }[] };
    try {
      const res = await fetch("/api/group-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: compressed }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      groupData = await res.json();
    } catch {
      // Fallback: each photo is its own group
      groupData = { groups: dataUrls.map((_, i) => ({ photos: [i], front: i, label: null })) };
    }

    /* 4. Build initial group state */
    const initialGroups: PhotoGroup[] = groupData.groups.map((g, i) => {
      const frontSubIdx = g.photos.indexOf(g.front);
      const rawLabelIdx = g.label !== null && g.label !== undefined ? g.photos.indexOf(g.label) : -1;
      return {
        id: i,
        photoIndices: g.photos,
        frontSubIdx: frontSubIdx >= 0 ? frontSubIdx : 0,
        labelSubIdx: rawLabelIdx >= 0 ? rawLabelIdx : null,
        activeSubIdx: 0,
        analyzing: true, analyzed: false,
        title: "", category: "", brand: "", size: "", color: "",
        condition: "", style: "", description: "",
        coins_value: null, coins_suggested: null, coins_reason: null, error: "",
      };
    });

    setGroups(initialGroups);
    setReviewIndex(0);
    setPhase("review");

    /* 5. Analyze each group in parallel */
    groupData.groups.forEach(async (g, i) => {
      const frontUrl = dataUrls[g.front];
      const labelUrl = g.label !== null && g.label !== undefined ? dataUrls[g.label] : null;

      const [compFront, compLabel] = await Promise.all([
        compress(frontUrl),
        labelUrl ? compress(labelUrl) : Promise.resolve(null),
      ]);

      try {
        const res = await fetch("/api/analyze-clothing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front: compFront, ...(compLabel ? { label: compLabel } : {}) }),
        });
        const data = await res.json();

        if (res.status === 422 && data.error === "not_clothing") {
          patchGroup(i, { analyzing: false, analyzed: true, error: "Not recognised as clothing — fill in manually." });
          return;
        }
        if (!res.ok) throw new Error(data.error ?? "Analysis failed");

        patchGroup(i, {
          analyzing: false, analyzed: true, error: "",
          title: data.title ?? "", category: data.category ?? "", brand: data.brand ?? "",
          size: data.size ?? "", color: normalizeColor(data.color ?? "") || data.color ?? "",
          condition: data.condition ?? "", style: data.style ?? "",
          description: data.description ?? "",
          coins_value: typeof data.coins_value === "number" ? data.coins_value : null,
          coins_suggested: typeof data.coins_value === "number" ? data.coins_value : null,
          coins_reason: data.coins_reason ?? null,
        });
      } catch {
        patchGroup(i, { analyzing: false, analyzed: true, error: "Analysis failed — fill in manually." });
      }
    });
  }

  /* ── Publish ───────────────────────────────────────────────────── */
  async function publishAll() {
    if (groups.some((g) => g.analyzing)) return;
    setPhase("publishing");
    setPublishError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPublishError("Not logged in."); setPhase("review"); return; }

    for (let idx = 0; idx < groups.length; idx++) {
      const group = groups[idx];
      const frontPhotoUrl = rawPhotos[group.photoIndices[group.frontSubIdx]];
      if (!frontPhotoUrl) continue;

      const [header, base64] = frontPhotoUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      const ext = mimeType.split("/")[1] ?? "jpg";
      const path = `${user.id}/${Date.now()}_multi_${idx}.${ext}`;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: mimeType });

      const { error: upErr } = await supabase.storage
        .from("clothing-images")
        .upload(path, blob, { contentType: mimeType, upsert: true });
      if (upErr) { setPublishError(`Upload failed for item ${idx + 1}`); setPhase("review"); return; }

      const { data: pub } = supabase.storage.from("clothing-images").getPublicUrl(path);

      const coinsToSave = group.coins_value ?? calculateCoins(group.condition, group.brand, group.category);
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        title: group.title || group.category || group.brand || "Item",
        brand: group.brand || null,
        size: group.size || null,
        condition: group.condition || null,
        style: group.style || null,
        category: group.category || null,
        description: group.description || null,
        image_url: pub.publicUrl,
        status: "active",
        coins_value: coinsToSave,
      };
      // color — only insert if the column exists (avoids crash if not migrated yet)
      if (group.color) insertData.color = group.color;

      console.log(`[multi-upload] inserting item ${idx + 1}:`, insertData);
      const { error: dbErr } = await supabase.from("clothing").insert(insertData);
      if (dbErr) {
        console.error(`[multi-upload] DB error item ${idx + 1}:`, dbErr);
        setPublishError(`Failed to save item ${idx + 1}: ${dbErr.message}`);
        setPhase("review");
        return;
      }
    }

    // Full reload so the profile page re-fetches items from Supabase
    window.location.href = "/profile";
  }

  /* ════════════════════════════════════════════════════════════════ */
  /*  PHASE: PICK                                                     */
  /* ════════════════════════════════════════════════════════════════ */
  if (phase === "pick") {
    return (
      <div style={{ width: "100%", minHeight: "100dvh", background: "#f9f4e8", fontFamily: FONT }}>
        <HeaderBar onBack={() => router.back()} title="Multiple items" />

        <div style={{ padding: "28px 24px 80px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Description */}
          <p style={{ fontSize: 15, color: "#7a6f5d", textAlign: "center", lineHeight: 1.65, marginBottom: 6, maxWidth: 290 }}>
            Select all your photos at once.<br />
            AI will <strong style={{ color: "#3c2f22" }}>group them by item</strong> and analyse each one automatically.
          </p>
          <p style={{ fontSize: 12, color: "#b3a896", textAlign: "center", marginBottom: 36 }}>
            E.g. 3 photos of a sweater + 4 of jeans → 2 items detected
          </p>

          {/* Pick button */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: 196, height: 196, borderRadius: 36,
              border: "2.5px dashed #b89b6e",
              background: "#3c2f22",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
              boxShadow: "0 10px 36px rgba(60,47,34,0.28)",
            }}
          >
            {/* Stack-of-photos icon */}
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Back card */}
              <rect x="10" y="26" width="44" height="32" rx="7" fill="rgba(255,197,67,0.18)" stroke="#FFC543" strokeWidth="2"
                transform="rotate(-9 32 42)" />
              {/* Mid card */}
              <rect x="10" y="26" width="44" height="32" rx="7" fill="rgba(255,197,67,0.30)" stroke="#FFC543" strokeWidth="2"
                transform="rotate(-4 32 42)" />
              {/* Front card — camera face */}
              <rect x="10" y="26" width="44" height="32" rx="7" fill="#3c2f22" stroke="#FFC543" strokeWidth="2" />
              {/* Viewfinder bump */}
              <path d="M28 26h-3a3 3 0 00-3 3" stroke="#FFC543" strokeWidth="1.8" strokeLinecap="round" />
              {/* Lens ring */}
              <circle cx="32" cy="42" r="9" stroke="#FFC543" strokeWidth="2" />
              {/* Lens fill */}
              <circle cx="32" cy="42" r="4" fill="#FFC543" />
              {/* Flash dot */}
              <circle cx="46" cy="31" r="2" fill="#FFC543" />
            </svg>
            <span style={{ color: "#FFC543", fontWeight: 800, fontSize: 15, letterSpacing: 0.2 }}>Choose photos</span>
          </button>

          <input
            ref={fileRef} type="file" accept="image/*" multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            style={{ display: "none" }}
          />

          <p style={{ marginTop: 20, fontSize: 12, color: "#b3a896", textAlign: "center" }}>Up to 12 photos total</p>

          {/* Tips */}
          <div style={{ marginTop: 36, width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📸", text: "Take front, back, label & detail shots for each item" },
              { icon: "🤖", text: "AI groups photos of the same item automatically" },
              { icon: "✏️", text: "Review and tweak each item before publishing" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ fontSize: 13, color: "#7a6f5d", lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════ */
  /*  PHASE: GROUPING                                                 */
  /* ════════════════════════════════════════════════════════════════ */
  if (phase === "grouping") {
    return (
      <div style={{
        width: "100%", height: "100dvh", background: "#f9f4e8", fontFamily: FONT,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "0 32px",
      }}>
        <style>{`@keyframes multi-spin { to { transform: rotate(360deg); } }`}</style>

        {/* Thumbnails preview */}
        {rawPhotos.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
            {rawPhotos.slice(0, 9).map((photo, i) => (
              <div key={i} style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", opacity: 0.55 }}>
                <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
            {rawPhotos.length > 9 && (
              <div style={{ width: 56, height: 56, borderRadius: 12, background: "#3c2f22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#FFC543", fontWeight: 700, fontSize: 13 }}>+{rawPhotos.length - 9}</span>
              </div>
            )}
          </div>
        )}

        {/* Spinner */}
        <span style={{ display: "inline-flex", animation: "multi-spin 1.1s linear infinite" }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path d="M44 13v11H33" stroke="#FFC543" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 39V28h11" stroke="#FFC543" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 20a15 15 0 0126-4.5l5 9M39 32a15 15 0 01-26 4.5l-5-9"
              stroke="#FFC543" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <p style={{ fontWeight: 800, fontSize: 18, color: "#3c2f22", textAlign: "center", margin: 0 }}>
          {groupingStatus}
        </p>
        <p style={{ fontSize: 13, color: "#9b8f7a", textAlign: "center", margin: 0 }}>
          {rawPhotos.length} photo{rawPhotos.length > 1 ? "s" : ""} selected
        </p>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════ */
  /*  PHASE: PUBLISHING                                               */
  /* ════════════════════════════════════════════════════════════════ */
  if (phase === "publishing") {
    return (
      <div style={{
        width: "100%", height: "100dvh", background: "#f9f4e8", fontFamily: FONT,
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <span style={{ fontSize: 52 }}>📦</span>
        <p style={{ fontWeight: 800, fontSize: 18, color: "#3c2f22", margin: 0 }}>Publishing…</p>
        {publishError && <p style={{ color: "#e03c3c", fontSize: 14, margin: 0 }}>{publishError}</p>}
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════ */
  /*  PHASE: REVIEW                                                   */
  /* ════════════════════════════════════════════════════════════════ */
  if (groups.length === 0) return null;

  const safeIdx = Math.min(reviewIndex, groups.length - 1);
  const cur = groups[safeIdx];
  const total = groups.length;
  const allDone = !groups.some((g) => g.analyzing);

  /* Current displayed photo */
  const displayPhotoUrl = rawPhotos[cur.photoIndices[cur.activeSubIdx]] ?? "";

  return (
    <div style={{ width: "100%", minHeight: "100dvh", background: "#f9f4e8", fontFamily: FONT }}>
      <style>{`@keyframes multi-spin { to { transform: rotate(360deg); } }`}</style>

      <HeaderBar onBack={() => setPhase("pick")} title={`Item ${safeIdx + 1} of ${total}`} />

      {/* ── Item thumbnail strip ─────────────────────────────────── */}
      <div style={{
        padding: "10px 16px 0", overflowX: "auto", display: "flex", gap: 8,
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {groups.map((g, i) => {
          const thumbSrc = rawPhotos[g.photoIndices[g.frontSubIdx]] ?? "";
          const isActive = i === safeIdx;
          return (
            <button
              key={g.id}
              onClick={() => setReviewIndex(i)}
              style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: 14,
                border: isActive ? "2.5px solid #3c2f22" : "2px solid transparent",
                overflow: "hidden", cursor: "pointer", background: "#3c2f22",
                padding: 0, position: "relative",
                boxShadow: isActive ? "0 3px 12px rgba(60,47,34,0.25)" : "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              {thumbSrc
                ? <img src={thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>#{i + 1}</span>
                  </div>
              }
              {/* Spinning overlay while analyzing */}
              {g.analyzing && (
                <div style={{
                  position: "absolute", inset: 0, background: "rgba(0,0,0,0.52)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ display: "inline-flex", animation: "multi-spin 1s linear infinite" }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M15 4.5v5.25h-5.25" stroke="#FFC543" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 13.5V8.25h5.25" stroke="#FFC543" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 7a7 7 0 0111.5-2l2.5 4M14 11a7 7 0 01-11.5 2l-2.5-4"
                        stroke="#FFC543" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              )}
              {/* Active indicator dot */}
              {isActive && !g.analyzing && (
                <div style={{
                  position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
                  width: 6, height: 6, borderRadius: "50%", background: "#FFC543",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{ padding: "12px 20px 0" }}>

        {/* Multi-photo strip for this group (shown only if >1 photo) */}
        {cur.photoIndices.length > 1 && (
          <div style={{
            display: "flex", gap: 7, marginBottom: 10, overflowX: "auto",
            scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
          }}>
            {cur.photoIndices.map((photoIdx, pi) => {
              const src = rawPhotos[photoIdx] ?? "";
              const isCurrent = pi === cur.activeSubIdx;
              return (
                <button
                  key={pi}
                  onClick={() => patchGroup(cur.id, { activeSubIdx: pi })}
                  style={{
                    flexShrink: 0,
                    width: isCurrent ? 76 : 58, height: isCurrent ? 76 : 58,
                    borderRadius: 14,
                    border: isCurrent ? "2.5px solid #3c2f22" : "2px solid rgba(60,47,34,0.12)",
                    overflow: "hidden", cursor: "pointer", padding: 0,
                    transition: "all 0.2s", background: "#e0d8cb",
                  }}
                >
                  {src && <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Main photo */}
        <div style={{
          position: "relative", width: "100%", aspectRatio: "3/4",
          borderRadius: 24, overflow: "hidden", background: "#3c2f22", marginBottom: 14,
        }}>
          {displayPhotoUrl
            ? <img src={displayPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Loading…</span>
              </div>
          }

          {/* Analyzing overlay */}
          {cur.analyzing && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.56)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            }}>
              <span style={{ display: "inline-flex", animation: "multi-spin 1.1s linear infinite" }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M34 10v9H25" stroke="#FFC543" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 30V21h9" stroke="#FFC543" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 16a12 12 0 0120.5-3.5l4.5 7.5M31 24a12 12 0 01-20.5 3.5L6 20"
                    stroke="#FFC543" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span style={{ color: "#FFC543", fontWeight: 800, fontSize: 15 }}>Analysing item…</span>
            </div>
          )}

          {/* Photo count badge */}
          {cur.photoIndices.length > 1 && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: "4px 10px",
            }}>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>
                {cur.activeSubIdx + 1} / {cur.photoIndices.length}
              </span>
            </div>
          )}
        </div>

        {/* Fields — only once analysis is done */}
        {!cur.analyzing && (
          <>
            {cur.error && (
              <div style={{ marginBottom: 12, background: "#f5dede", borderRadius: 14, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#7a2e26" }}>⚠ {cur.error}</p>
              </div>
            )}

            <SimpleField label="Title" value={cur.title} onChange={(v) => patchGroup(cur.id, { title: v })} />
            <SimpleField label="Category" value={cur.category} onChange={(v) => patchGroup(cur.id, { category: v })} />
            <SimpleField label="Brand" value={cur.brand} onChange={(v) => patchGroup(cur.id, { brand: v })} />
            <ColorSwatches value={cur.color} onChange={(v) => patchGroup(cur.id, { color: v })} />
            <ChipField label="Size" value={cur.size} onChange={(v) => patchGroup(cur.id, { size: v })} options={SIZES} />
            <ChipField label="Condition" value={cur.condition} onChange={(v) => patchGroup(cur.id, { condition: v })} options={CONDITIONS} />
            <SimpleField label="Style" value={cur.style} onChange={(v) => patchGroup(cur.id, { style: v })} />

            {/* Coins banner — ±15% autour de la suggestion TRADE */}
            {(() => {
              const suggested = cur.coins_suggested ?? calculateCoins(cur.condition, cur.brand, cur.category);
              const minC = Math.max(5, Math.round(suggested * 0.85));
              const maxC = Math.min(500, Math.round(suggested * 1.15));
              const coins = cur.coins_value ?? suggested;
              const clamp = (v: number) => Math.min(maxC, Math.max(minC, v));
              const pct = suggested > 0 ? Math.round(((coins - suggested) / suggested) * 100) : 0;
              return (
                <div style={{ marginBottom: 14, background: "#f0e2b8", borderRadius: 16, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => patchGroup(cur.id, { coins_value: clamp(coins - 1) })}
                      disabled={coins <= minC}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: coins <= minC ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 18, fontWeight: 800, cursor: coins <= minC ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
                    >−</button>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#8a6d2a" }}>{coins}</span>
                      <span style={{ fontSize: 12, color: "#9a7d3a", marginLeft: 4 }}>🪙</span>
                    </div>
                    <button
                      onClick={() => patchGroup(cur.id, { coins_value: clamp(coins + 1) })}
                      disabled={coins >= maxC}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: coins >= maxC ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 18, fontWeight: 800, cursor: coins >= maxC ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
                    >+</button>
                  </div>
                  <input
                    type="range" min={minC} max={maxC}
                    value={coins}
                    onChange={(e) => patchGroup(cur.id, { coins_value: Number(e.target.value) })}
                    style={{ width: "100%", marginTop: 8, accentColor: "#3c2f22" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9a7d3a", marginTop: 2 }}>
                    <span>{minC}</span>
                    <span style={{ fontWeight: 700 }}>{pct === 0 ? "TRADE suggestion" : pct > 0 ? `+${pct}%` : `${pct}%`}</span>
                    <span>{maxC}</span>
                  </div>
                  {cur.coins_reason && (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9a7d3a", lineHeight: 1.4 }}>
                      💡 {cur.coins_reason}
                    </p>
                  )}
                </div>
              );
            })()}

            {cur.description && (
              <div style={{ marginBottom: 14, background: "#eef4fb", borderRadius: 16, padding: "10px 14px", border: "1.5px solid #c5d9ef" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#3a7bd5" }}>🔒 AI description</p>
                <p style={{ margin: 0, fontSize: 13, color: "#2A2A2A", lineHeight: 1.6 }}>{cur.description}</p>
              </div>
            )}

            {/* Extra padding so content isn't hidden behind fixed bar */}
            <div style={{ height: 110 }} />
          </>
        )}

        {cur.analyzing && <div style={{ height: 110 }} />}
      </div>

      {/* ── Error banner (floats above nav bar after failed publish) ── */}
      {publishError && (
        <div style={{
          position: "fixed", bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          left: 16, right: 16, zIndex: 200,
          background: "#fdecea", border: "1.5px solid #e03c3c", borderRadius: 14,
          padding: "10px 14px", textAlign: "center",
          boxShadow: "0 4px 16px rgba(224,60,60,0.2)",
        }}>
          <p style={{ margin: 0, color: "#c0392b", fontSize: 13, fontWeight: 700 }}>
            🚫 {publishError}
          </p>
        </div>
      )}

      {/* ── Fixed bottom navigation bar ──────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#f9f4e8",
        borderTop: "1px solid rgba(60,47,34,0.08)",
        padding: `12px 20px calc(16px + env(safe-area-inset-bottom, 0px))`,
        display: "flex", gap: 10,
      }}>
        {/* ← Previous */}
        <button
          disabled={safeIdx === 0}
          onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
          style={{
            width: 52, height: 52, borderRadius: 26,
            border: "none",
            background: safeIdx === 0 ? "#e6ddca" : "#ede8dc",
            color: safeIdx === 0 ? "#b3a896" : "#3c2f22",
            fontWeight: 700, fontSize: 20,
            cursor: safeIdx === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >←</button>

        {/* Centre button: Next item OR Publish all */}
        {safeIdx < total - 1 ? (
          <button
            onClick={() => setReviewIndex((i) => i + 1)}
            style={{
              flex: 1, height: 52, borderRadius: 26,
              border: "none", background: "#3c2f22", color: "#FFC543",
              fontWeight: 800, fontSize: 15, cursor: "pointer",
            }}
          >
            Next item →
          </button>
        ) : (
          <button
            onClick={publishAll}
            disabled={!allDone}
            style={{
              flex: 1, height: 52, borderRadius: 26, border: "none",
              background: allDone ? "#FFC543" : "#e6ddca",
              color: allDone ? "#2D1A0A" : "#b3a896",
              fontWeight: 800, fontSize: 15,
              cursor: allDone ? "pointer" : "not-allowed",
              boxShadow: allDone ? "0 6px 20px rgba(255,197,67,0.4)" : "none",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          >
            {allDone ? `Publish ${total} item${total > 1 ? "s" : ""}` : "Analysing…"}
          </button>
        )}

        {/* Quick-publish shortcut (shown when not on last item) */}
        {safeIdx < total - 1 && (
          <button
            onClick={publishAll}
            disabled={!allDone}
            title={allDone ? `Publish all ${total} items` : "Still analysing…"}
            style={{
              width: 52, height: 52, borderRadius: 26, border: "none",
              background: allDone ? "#FFC543" : "#e6ddca",
              color: allDone ? "#2D1A0A" : "#b3a896",
              fontWeight: 800, fontSize: 10,
              cursor: allDone ? "pointer" : "not-allowed",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 1, lineHeight: 1.2, flexShrink: 0,
              transition: "background 0.3s",
            }}
          >
            <span style={{ fontSize: 16 }}>✓</span>
            <span>All</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Coins calculation (mirrors the formula in single upload)            */
/* ─────────────────────────────────────────────────────────────────── */
function calculateCoins(condition: string, brand: string, category: string): number {
  const cat = (category ?? "").toLowerCase();
  let base = 20;
  if (cat.includes("outerwear") || cat.includes("jacket") || cat.includes("coat")) base = 40;
  else if (cat.includes("shoes") || cat.includes("sneakers") || cat.includes("boots")) base = 35;
  else if (cat.includes("dress")) base = 30;
  else if (cat.includes("bottom") || cat.includes("jeans") || cat.includes("pant")) base = 25;
  else if (cat.includes("sport")) base = 25;
  else if (cat.includes("accessori") || cat.includes("bag") || cat.includes("belt")) base = 20;

  const b = (brand ?? "").toLowerCase();
  let brandMult = 1.0;
  const luxury = ["gucci","louis vuitton","lv","prada","balenciaga","off-white","dior","versace","moncler","ysl","saint laurent","bottega","fendi"];
  const premium = ["ralph lauren","tommy hilfiger","calvin klein","hugo boss","lacoste","burberry","armani","boss"];
  const popular = ["nike","adidas","zara","h&m","levi","north face","stone island","carhartt","new balance","puma","reebok","jordan","converse","vans","champion"];
  const fastFashion = ["primark","shein","boohoo","forever 21","asos","prettylittlething","missguided"];
  if (luxury.some((l) => b.includes(l))) brandMult = 4.0;
  else if (premium.some((p) => b.includes(p))) brandMult = 2.5;
  else if (popular.some((p) => b.includes(p))) brandMult = 1.8;
  else if (fastFashion.some((f) => b.includes(f))) brandMult = 0.8;

  const c = (condition ?? "").toLowerCase();
  let condMult = 1.0;
  if (c === "new") condMult = 2.0;
  else if (c === "like_new") condMult = 1.6;
  else if (c === "good") condMult = 1.2;
  else if (c === "used") condMult = 0.8;
  else if (c === "worn") condMult = 0.5;

  return Math.min(500, Math.max(5, Math.round(base * brandMult * condMult)));
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Sub-components                                                      */
/* ─────────────────────────────────────────────────────────────────── */

function HeaderBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end",
        paddingTop: "max(env(safe-area-inset-top), 44px)",
        paddingBottom: 14, paddingLeft: 16, paddingRight: 16,
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", marginRight: 12, padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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

function SimpleField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a6f5d", marginBottom: 5 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", height: 46, background: "#fff", border: "none",
          borderRadius: 23, padding: "0 16px", fontSize: 15, color: "#2D1A0A",
          outline: "none", boxSizing: "border-box",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      />
    </div>
  );
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const normalized = UPLOAD_COLORS.find((c) => c.name === value)?.name ?? normalizeColor(value);
  const active = normalized || value;
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a6f5d", marginBottom: 8 }}>Color</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {UPLOAD_COLORS.map((c) => {
          const isActive = active === c.name;
          return (
            <button
              key={c.name}
              onClick={() => onChange(isActive ? "" : c.name)}
              title={c.name}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                height: 32, padding: "0 10px 0 6px",
                borderRadius: 16, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: isActive ? "#3c2f22" : "#ede8dc",
                color: isActive ? "#FFC543" : "#3c2f22",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{
                width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                background: c.hex,
                border: isActive ? "2px solid #FFC543" : "1.5px solid rgba(45,26,10,0.18)",
              }} />
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#7a6f5d", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            style={{
              padding: "6px 13px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
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
