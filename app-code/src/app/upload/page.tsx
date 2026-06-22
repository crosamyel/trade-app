"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeaderActions } from "@/components/HeaderActions";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* Données extraites par l'IA. Les 4 premières sont affichées dans le formulaire ;
   brand/material/style/description sont gardées pour l'insert DB futur. */
type Analysis = {
  category: string;
  size: string;
  color: string;
  condition: string;
  brand: string;
  material: string;
  style: string;
  description: string;
};

const EMPTY_ANALYSIS: Analysis = {
  category: "", size: "", color: "", condition: "",
  brand: "", material: "", style: "", description: "",
};

/* Les 4 slots photo : front + back + label obligatoires, detail optionnel */
export type SlotId = "front" | "back" | "label" | "detail";
export type Photos = Record<SlotId, string | null>;

export default function UploadPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photos, setPhotos] = useState<Photos>({ front: null, back: null, label: null, detail: null });
  const [analysis, setAnalysis] = useState<Analysis>(EMPTY_ANALYSIS);

  // Reçoit les données IA et passe à l'étape 3 en une seule mise à jour
  function handleAnalysisDone(data: Partial<Analysis>) {
    setAnalysis(prev => ({
      ...prev,
      category:    data.category    || prev.category,
      size:        data.size        || prev.size,
      color:       data.color       || prev.color,
      condition:   data.condition   || prev.condition,
      brand:       data.brand       || prev.brand,
      material:    data.material    || prev.material,
      style:       data.style       || prev.style,
      description: data.description || prev.description,
    }));
    setStep(3);
  }

  return (
    <div style={{
      position: "relative", width: "100%", minHeight: "100dvh",
      background: "#f9f4e8", fontFamily: FONT, overflowX: "hidden",
    }}>
      <Header />
      <ProgressBar step={step} />

      {step === 1 && (
        <StepPhoto photos={photos} setPhotos={setPhotos} onAnalyse={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepAnalyse photos={photos} onDone={handleAnalysisDone} />
      )}
      {step === 3 && (
        <StepVerify photos={photos} analysis={analysis} setAnalysis={setAnalysis} />
      )}
    </div>
  );
}

/* ===== HEADER ===== */
function Header() {
  return (
    <div style={{
      position: "relative", background: "#3c2f22",
      height: "calc(112px + env(safe-area-inset-top))",
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      paddingTop: "env(safe-area-inset-top)", paddingBottom: 14,
    }}>
      <div style={{ position: "relative", width: 130, height: 40 }}>
        <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
      </div>
      <HeaderActions />
    </div>
  );
}

/* ===== BARRE DE PROGRESSION ===== */
function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const labels = { 1: "Photo", 2: "Analysis", 3: "Verify" } as const;
  return (
    <div style={{ padding: "20px 24px 4px" }}>
      <div style={{ height: 8, borderRadius: 4, background: "#3c2f22", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(step / 3) * 100}%`, background: "#FFC543", borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
      <p style={{ textAlign: "center", margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: "#b9a98c" }}>
        {labels[step]}
      </p>
    </div>
  );
}

/* ===== ÉTAPE 1 — PHOTO ===== */
const SLOT_META: { id: SlotId; label: string; required: boolean; ai?: boolean }[] = [
  { id: "front",  label: "Front",  required: true },
  { id: "back",   label: "Back",   required: true },
  { id: "label",  label: "Label",  required: true, ai: true },
  { id: "detail", label: "Detail", required: false },
];

function StepPhoto({ photos, setPhotos, onAnalyse }: {
  photos: Photos;
  setPhotos: React.Dispatch<React.SetStateAction<Photos>>;
  onAnalyse: () => void;
}) {
  function setSlot(id: SlotId, value: string | null) {
    setPhotos((p) => ({ ...p, [id]: value }));
  }

  // IA dispo dès que front + étiquette sont là
  const canAnalyse = !!photos.front && !!photos.label;

  return (
    <div style={{ padding: "12px 24px 140px" }}>
      <p style={{ fontSize: 13, color: "#7a6f5d", textAlign: "center", margin: "0 0 18px", lineHeight: 1.5 }}>
        Add the <strong>front</strong>, <strong>back</strong> and <strong>label</strong> of your item.
      </p>

      {/* Grille 2×2 des slots — remplit la largeur */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {SLOT_META.map((s) => (
          <PhotoSlot
            key={s.id}
            meta={s}
            value={photos[s.id]}
            onPick={(dataUrl) => setSlot(s.id, dataUrl)}
            onClear={() => setSlot(s.id, null)}
          />
        ))}
      </div>

      {/* Bouton Analyser */}
      <button
        onClick={onAnalyse}
        disabled={!canAnalyse}
        style={{
          marginTop: 28, width: "100%", height: 56, borderRadius: 28, border: "none",
          background: canAnalyse ? "#FFC543" : "#e6ddca",
          color: canAnalyse ? "#2D1A0A" : "#b3a896",
          fontSize: 17, fontWeight: 800,
          cursor: canAnalyse ? "pointer" : "not-allowed",
          boxShadow: canAnalyse ? "0 6px 18px rgba(255,197,67,0.45)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 0.2s, color 0.2s",
        }}
      >
        <BoltIcon color={canAnalyse ? "#2D1A0A" : "#b3a896"} /> Analyze with AI
      </button>
      {!canAnalyse && (
        <p style={{ fontSize: 12, color: "#b3a896", textAlign: "center", margin: "10px 0 0" }}>
          Front + label required to run the AI
        </p>
      )}
    </div>
  );
}

function PhotoSlot({ meta, value, onPick, onClear }: {
  meta: { id: SlotId; label: string; required: boolean; ai?: boolean };
  value: string | null;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ""; // permet de re-choisir le même fichier
  }

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
      {value ? (
        <>
          <img src={value} alt={meta.label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
          {/* X de suppression */}
          <button
            onClick={onClear}
            style={{
              position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%",
              background: "#e03c3c", border: "2px solid #fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
            aria-label={`Supprimer ${meta.label}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: "100%", height: "100%", borderRadius: 16,
            background: "#3c2f22", border: "2px dashed #b89b6e",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: "pointer",
          }}
        >
          <CameraIcon small />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f3ead7" }}>
            {meta.label}{meta.required ? "" : <span style={{ color: "rgba(243,234,215,0.55)", fontWeight: 500 }}> (opt.)</span>}
          </span>
        </button>
      )}

      {/* Badge IA pour l'étiquette */}
      {meta.ai && (
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "#FFC543", borderRadius: 12, padding: "3px 7px",
          display: "flex", alignItems: "center", gap: 3,
          boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
        }}>
          <BoltIcon color="#2D1A0A" small />
          <span style={{ fontSize: 10, fontWeight: 800, color: "#2D1A0A" }}>IA</span>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

function BoltIcon({ color, small }: { color: string; small?: boolean }) {
  const s = small ? 11 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

/* ===== ÉTAPE 2 — ANALYSE (IA réelle GPT-4o) ===== */
function StepAnalyse({ photos, onDone }: {
  photos: Photos;
  onDone: (data: Partial<Analysis>) => void;
}) {
  const [phase, setPhase] = useState(0); // 0 type, 1 estimation, 2 description
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState("");

  // Ref pour toujours appeler la dernière version d'onDone sans re-déclencher l'effet
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  // Animation cosmétique de la checklist
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Appel IA réel : étiquette (marque/taille/matière) + face avant (style/condition/desc)
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function run() {
      let analysisData: Partial<Analysis> = {};
      try {
        const res = await fetch("/api/analyze-clothing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: photos.label, front: photos.front }),
        });
        const data = await res.json();
        console.log("[AI] résultat brut:", data);
        if (res.status === 422 && data.error === 'invalid_image') {
          if (!cancelled) {
            setFailed(true);
            setFailReason(data.reason || "This doesn't look like a real clothing photo.");
          }
        } else if (res.ok) {
          analysisData = {
            category:    data.category    || "",
            size:        data.size        || "",
            color:       data.color       || "",
            condition:   data.condition   || "",
            brand:       data.brand       || "",
            material:    data.material    || "",
            style:       data.style       || "",
            description: data.description || "",
          };
        } else {
          if (!cancelled) { console.error("AI error:", data); setFailed(true); }
        }
      } catch (e) {
        if (!cancelled) { console.error(e); setFailed(true); }
      } finally {
        // Affichage minimum ~1.8s pour que l'animation soit lisible
        const wait = Math.max(0, 1800 - (Date.now() - started));
        setTimeout(() => { if (!cancelled) onDoneRef.current(analysisData); }, wait);
      }
    }
    run();
    return () => { cancelled = true; };
  // photos.label et photos.front ne changent pas pendant l'analyse
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.label, photos.front]);

  return (
    <div style={{ padding: "12px 24px 120px" }}>
      <PhotoRow photos={photos} />

      {/* Spinner */}
      <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 6px" }}>
        <span style={{ display: "inline-flex", animation: "trade-spin 1s linear infinite" }}>
          <RefreshIcon />
        </span>
      </div>
      <p style={{ textAlign: "center", fontWeight: 600, color: "#2A2A2A", margin: "0 0 20px" }}>AI is analysing...</p>

      {/* Checklist */}
      <div style={{ background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
        <CheckRow state="done" label="Type detected" />
        <CheckRow state={phase >= 1 ? "done" : "active"} label="Reading label (brand · size)" />
        <CheckRow state={phase >= 2 ? "done" : "idle"} label="Generating description" />
      </div>

      {/* Carte info bleue / erreur */}
      <div style={{ marginTop: 16, background: failed ? "#f3d3cf" : "#bcd6ea", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <SparkIcon />
        <span style={{ fontSize: 14, color: failed ? "#7a2e26" : "#1f3a52", fontWeight: 600 }}>
          {failed
            ? (failReason || "AI analysis unavailable — you can fill it in manually.")
            : "Real image, no web match."}
        </span>
      </div>

      <style>{`@keyframes trade-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CheckRow({ state, label }: { state: "done" | "active" | "idle"; label: string }) {
  const color = state === "done" ? "#5d8f3c" : state === "active" ? "#3c2f22" : "#bbb";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      {state === "done" ? <DoubleCheck color={color} /> : state === "active" ? <SmallSpinner color={color} /> : <EmptyCircle color={color} />}
      <span style={{ fontSize: 14, color, fontWeight: state === "idle" ? 500 : 600 }}>{label}</span>
    </div>
  );
}

/* Calcule le nombre de coins selon condition + marque */
function calculateCoins(condition: string, brand: string): number {
  let base = 15;
  const c = condition.toLowerCase();
  if (c === "neuf" || c === "new")                    base = 40;
  else if (c === "comme neuf" || c === "like new")    base = 30;
  else if (c === "bon état" || c === "used")          base = 20;
  else if (c === "usé" || c === "worn")               base = 10;

  const premiumBrands = ["nike","adidas","zara","h&m","stone island","supreme","palace","carhartt","levi","ralph lauren","tommy hilfiger"];
  if (brand && premiumBrands.some(b => brand.toLowerCase().includes(b))) base += 10;
  return Math.min(base, 100);
}

/* ===== ÉTAPE 3 — VERIFY ===== */
function StepVerify({ photos, analysis, setAnalysis }: {
  photos: Photos;
  analysis: Analysis;
  setAnalysis: (a: Analysis) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const coinsValue = calculateCoins(analysis.condition, analysis.brand);

  const canSubmit = !!photos.front && !!photos.back && !!photos.label;

  async function uploadDataUrl(dataUrl: string, userId: string, slot: string): Promise<string | null> {
    const [header, base64] = dataUrl.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const ext = mimeType.split("/")[1] ?? "jpg";
    const path = `${userId}/${Date.now()}_${slot}.${ext}`;
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });

    console.log(`[upload] ${slot} → ${path}`);
    const { error: upErr } = await supabase.storage.from("clothing-images").upload(path, blob, { contentType: mimeType, upsert: true });
    if (upErr) { console.error(`[upload] ${slot} error:`, upErr.message, upErr); return null; }

    const { data } = supabase.storage.from("clothing-images").getPublicUrl(path);
    console.log(`[upload] ${slot} public URL:`, data.publicUrl);
    return data.publicUrl;
  }

  async function handleTrade() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        console.error("[upload] not authenticated:", authErr);
        setError("Not authenticated. Please sign in again.");
        setSubmitting(false);
        return;
      }
      console.log("[upload] user:", user.id);

      // Upload séquentiel pour récupérer l'erreur précise du premier slot
      let frontUrl: string | null = null;
      let backUrl: string | null = null;
      let labelUrl: string | null = null;
      let detailUrl: string | null = null;

      if (photos.front) {
        frontUrl = await uploadDataUrl(photos.front, user.id, "front");
        if (!frontUrl) {
          setError("Front photo upload failed — check browser console for details.");
          setSubmitting(false);
          return;
        }
      }
      if (photos.back)   backUrl   = await uploadDataUrl(photos.back,   user.id, "back");
      if (photos.label)  labelUrl  = await uploadDataUrl(photos.label,  user.id, "label");
      if (photos.detail) detailUrl = await uploadDataUrl(photos.detail, user.id, "detail");

      const insertData = {
        user_id:          user.id,
        title:            analysis.category || "Item",
        brand:            analysis.brand    || null,
        size:             analysis.size     || null,
        condition:        analysis.condition || null,
        style:            analysis.style    || null,
        category:         analysis.category || null,
        description:      analysis.description || null,
        image_url:        frontUrl,
        image_back_url:   backUrl  || null,
        image_label_url:  labelUrl || null,
        image_detail_url: detailUrl || null,
        coins_value:      coinsValue,
        location:         null,
        status:           "active",
      };
      console.log("[upload] inserting:", insertData);

      const { error: dbErr } = await supabase.from("clothing").insert(insertData);
      if (dbErr) {
        console.error("[upload] DB error:", dbErr);
        setError("Database error: " + dbErr.message);
        setSubmitting(false);
        return;
      }
      console.log("[upload] item created successfully");
      router.push("/home");

    } catch (e) {
      console.error("[upload] unexpected:", e);
      setError("Unexpected error. Check the browser console.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "12px 24px 130px" }}>
      <PhotoRow photos={photos} />

      <div style={{ marginTop: 18 }}>
        <Field label="Category" value={analysis.category} onChange={(v) => setAnalysis({ ...analysis, category: v })} />
        <Field label="Brand" value={analysis.brand} onChange={(v) => setAnalysis({ ...analysis, brand: v })} />
        <Field label="Size" value={analysis.size} onChange={(v) => setAnalysis({ ...analysis, size: v })} />
        <Field label="Color" value={analysis.color} onChange={(v) => setAnalysis({ ...analysis, color: v })} />
        <Field label="Condition" value={analysis.condition} onChange={(v) => setAnalysis({ ...analysis, condition: v })} />
        <DescField value={analysis.description} onChange={(v) => setAnalysis({ ...analysis, description: v })} />
      </div>

      {/* Bandeau coins */}
      <div style={{
        marginTop: 14, background: "#f0e2b8", borderRadius: 16, height: 46,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#8a6d2a" }}>You will get {coinsValue} coins</span>
        <div style={{ position: "relative", width: 20, height: 20 }}>
          <Image src="/coin.png" alt="coin" fill style={{ objectFit: "contain" }} />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#e03c3c", textAlign: "center", margin: "12px 0 0", lineHeight: 1.4 }}>{error}</p>
      )}

      {/* Bouton Trade */}
      <button
        onClick={handleTrade}
        disabled={submitting || !canSubmit}
        style={{
          marginTop: 22, width: "100%", height: 58, borderRadius: 29,
          background: canSubmit ? "#FFC543" : "#e6ddca", border: "none",
          color: canSubmit ? "#fff" : "#b3a896", fontSize: 22, fontWeight: 800, fontStyle: "italic",
          cursor: (submitting || !canSubmit) ? "not-allowed" : "pointer",
          boxShadow: canSubmit ? "0 6px 18px rgba(255,197,67,0.45)" : "none",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "..." : "Trade"}
      </button>
      {!canSubmit && (
        <p style={{ fontSize: 12, color: "#b3a896", textAlign: "center", margin: "10px 0 0" }}>
          Front, back and label required
        </p>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 14, color: "#7a6f5d", marginBottom: 5 }}>{label}</label>
      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        background: "#fff", borderRadius: 22, height: 44, padding: "0 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#2A2A2A" }}
        />
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 700, color: "#3a7bd5" }}>
          AI <DoubleCheck color="#3a7bd5" small />
        </span>
      </div>
    </div>
  );
}

function DescField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 14, color: "#7a6f5d", marginBottom: 5 }}>Description</label>
      <div style={{
        position: "relative", background: "#fff", borderRadius: 18, padding: "10px 14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#2A2A2A", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
        />
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 700, color: "#3a7bd5", justifyContent: "flex-end" }}>
          AI <DoubleCheck color="#3a7bd5" small />
        </span>
      </div>
    </div>
  );
}

/* ===== Sous-composants partagés ===== */
function PhotoRow({ photos }: { photos: Photos }) {
  const shown: (string | null)[] = [photos.front, photos.back, photos.label];
  return (
    <div style={{
      display: "flex", gap: 6, background: "#fff", borderRadius: 18, padding: 6,
      boxShadow: "0 4px 16px rgba(0,0,0,0.07)",
    }}>
      {shown.map((src, i) => (
        <div key={i} style={{ flex: 1, aspectRatio: "1 / 1", borderRadius: 12, overflow: "hidden", background: "#ece6d8", position: "relative" }}>
          {src
            ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb" }}><CameraIcon small /></div>}
        </div>
      ))}
    </div>
  );
}

/* ===== Icônes ===== */
function CameraIcon({ small }: { small?: boolean }) {
  const s = small ? 24 : 56;
  return (
    <svg width={s} height={s} viewBox="0 0 56 56" fill="none">
      <rect x="6" y="16" width="44" height="30" rx="6" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
      <path d="M20 16l3-6h10l3 6" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="28" cy="31" r="8" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M40 12v10H30" stroke="#FFC543" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 36V26h10" stroke="#FFC543" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18a14 14 0 0124-4l4 8M36 30a14 14 0 01-24 4l-4-8" stroke="#FFC543" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoubleCheck({ color, small }: { color: string; small?: boolean }) {
  const s = small ? 16 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
      <path d="M2 11l4 4 8-9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14l1 1 8-9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmallSpinner({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "trade-spin 1s linear infinite" }}>
      <path d="M14 8a6 6 0 10-2 4.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EmptyCircle({ color }: { color: string }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" /></svg>;
}

function SparkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="#1f3a52" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3.2" stroke="#1f3a52" strokeWidth="1.8" />
    </svg>
  );
}

