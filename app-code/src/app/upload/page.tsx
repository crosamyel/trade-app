"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { HeaderActions } from "@/components/HeaderActions";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/* Données extraites par l'IA. Les 4 premières sont affichées dans le formulaire ;
   brand/material/style/description sont gardées pour l'insert DB futur. */
type Analysis = {
  title: string;
  category: string;
  size: string;
  color: string;
  condition: string;
  brand: string;
  material: string;
  style: string;
  description: string;
  coins_value: number | null;
  coins_reason: string | null;
  fake_warning: boolean;
  fake_reason: string | null;
};

const EMPTY_ANALYSIS: Analysis = {
  title: "", category: "", size: "", color: "", condition: "",
  brand: "", material: "", style: "", description: "",
  coins_value: null, coins_reason: null, fake_warning: false, fake_reason: null,
};

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

/* Normalise la couleur renvoyée par l'IA vers nos valeurs standards */
function normalizeColor(aiColor: string): string {
  const c = (aiColor ?? "").toLowerCase().trim();
  const map: [string[], string][] = [
    [["black","noir","zwart","negro","schwarz","dark"], "Black"],
    [["white","blanc","wit","blanco","weiß","weiss","cream","ivoire","ivory"], "White"],
    [["grey","gray","gris","grijs","grau","silver","argent"], "Grey"],
    [["beige","sand","sable","camel","ecru","taupe"], "Beige"],
    [["brown","marron","bruin","braun","tan","caramel","chocolate","chocolat"], "Brown"],
    [["blue","bleu","blauw","blau","navy","marine","indigo","denim","cobalt"], "Blue"],
    [["green","vert","groen","grün","grun","khaki","olive","forest"], "Green"],
    [["red","rouge","rood","rot","burgundy","bordeaux","wine","cardinal"], "Red"],
    [["yellow","jaune","geel","gelb","gold","mustard"], "Yellow"],
    [["pink","rose","roze","rosa","fuchsia","magenta","salmon","saumon"], "Pink"],
    [["orange","oranje"], "Orange"],
    [["purple","violet","lila","mauve","lavender","lavande","lilac"], "Purple"],
  ];
  for (const [aliases, standard] of map) {
    if (aliases.some((a) => c.includes(a))) return standard;
  }
  return "";
}

/* Les 4 slots photo : front + back + label obligatoires, detail optionnel */
export type SlotId = "front" | "back" | "label" | "detail";
export type Photos = Record<SlotId, string | null>;

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photos, setPhotos] = useState<Photos>({ front: null, back: null, label: null, detail: null });
  const [analysis, setAnalysis] = useState<Analysis>(EMPTY_ANALYSIS);
  const [notClothingError, setNotClothingError] = useState(false);
  const [published, setPublished] = useState(false);

  function handleNotClothing() {
    setPhotos({ front: null, back: null, label: null, detail: null });
    setStep(1);
    setNotClothingError(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Reçoit les données IA et passe à l'étape 3
  function handleAnalysisDone(data: Partial<Analysis>) {
    setAnalysis({
      title:        data.title        ?? "",
      category:     data.category     ?? "",
      size:         data.size         ?? "",
      color:        data.color        ?? "",
      condition:    data.condition    ?? "",
      brand:        data.brand        ?? "",
      material:     data.material     ?? "",
      style:        data.style        ?? "",
      description:  data.description  ?? "",
      coins_value:  data.coins_value  ?? null,
      coins_reason: data.coins_reason ?? null,
      fake_warning: data.fake_warning ?? false,
      fake_reason:  data.fake_reason  ?? null,
    });
    setStep(3);
  }

  return (
    <div style={{
      position: "relative", width: "100%", minHeight: "100dvh",
      background: "#f9f4e8", fontFamily: FONT, overflowX: "hidden",
    }}>
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
      <Header />
      <ProgressBar step={step} />

      {step === 1 && (
        <StepPhoto photos={photos} setPhotos={setPhotos} onAnalyse={() => setStep(2)} onMulti={() => router.push("/upload/multi")} />
      )}
      {step === 2 && (
        <StepAnalyse photos={photos} onDone={handleAnalysisDone} onNotClothing={handleNotClothing} />
      )}
      {step === 3 && (
        <StepVerify photos={photos} analysis={analysis} setAnalysis={setAnalysis} onPublished={() => setPublished(true)} />
      )}

      {/* ── Success overlay ── */}
      {published && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(20,12,4,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "#f9f4e8", borderRadius: 28, padding: "36px 28px",
            maxWidth: 340, width: "100%", textAlign: "center",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#3c2f22" }}>
              Item published!
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "#7a6f5d", lineHeight: 1.5 }}>
              Your item is now live on TRADE.<br />Other users can discover and trade with you.
            </p>
            <button
              onClick={() => router.push("/profile")}
              style={{ width: "100%", height: 52, borderRadius: 26, background: "#FFC543", border: "none", color: "#2D1A0A", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 12, boxShadow: "0 6px 18px rgba(255,197,67,0.45)" }}
            >
              View my profile
            </button>
            <button
              onClick={() => router.push("/home")}
              style={{ width: "100%", height: 44, borderRadius: 22, background: "transparent", border: "1.5px solid #3c2f22", color: "#3c2f22", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Go to Explore
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== HEADER ===== */
function Header() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#3c2f22",
        height: "calc(68px + max(env(safe-area-inset-top), 44px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top), 44px)", paddingBottom: 14,
      }}>
        <div style={{ position: "relative", width: 130, height: 40 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} />
        </div>
        <HeaderActions />
      </div>
      <div style={{ height: "calc(68px + max(env(safe-area-inset-top), 44px))" }} />
    </>
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

function StepPhoto({ photos, setPhotos, onAnalyse, onMulti }: {
  photos: Photos;
  setPhotos: React.Dispatch<React.SetStateAction<Photos>>;
  onAnalyse: () => void;
  onMulti: () => void;
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

      {/* Option multi-vêtements */}
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#9b8f7a", marginBottom: 8 }}>Got multiple items to upload?</p>
        <button onClick={onMulti} style={{ background: "none", border: "1.5px solid #b89b6e", borderRadius: 20, padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "#3c2f22", cursor: "pointer" }}>
          Multiple items →
        </button>
      </div>
    </div>
  );
}

function PhotoSlot({ meta, value, onPick, onClear }: {
  meta: { id: SlotId; label: string; required: boolean; ai?: boolean };
  value: string | null;
  onPick: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
    setShowPicker(false);
  }

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1" }}>
      {value ? (
        <>
          <img src={value} alt={meta.label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
          <button
            onClick={onClear}
            style={{
              position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%",
              background: "#e03c3c", border: "2px solid #fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
            aria-label={`Remove ${meta.label}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </>
      ) : showPicker ? (
        <div style={{
          width: "100%", height: "100%", borderRadius: 16,
          background: "#3c2f22", border: "2px dashed #b89b6e",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <button
            onClick={() => cameraRef.current?.click()}
            style={{ width: "80%", height: 40, borderRadius: 20, background: "#FFC543", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#2D1A0A", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="14" r="4" stroke="currentColor" strokeWidth="2" /><path d="M9 7l1.5-3h3L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Camera
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            style={{ width: "80%", height: 40, borderRadius: 20, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#f3ead7", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M3 15l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Gallery
          </button>
          <button onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
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

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
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

const ANALYSE_MESSAGES = [
  "Analyzing your item...",
  "Detecting brand...",
  "Estimating condition...",
  "Calculating coins value...",
];

/* ===== ÉTAPE 2 — ANALYSE (IA réelle GPT-4o) ===== */
function StepAnalyse({ photos, onDone, onNotClothing }: {
  photos: Photos;
  onDone: (data: Partial<Analysis>) => void;
  onNotClothing: () => void;
}) {
  const [phase, setPhase] = useState(0); // 0 type, 1 estimation, 2 description
  const [msgIdx, setMsgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [failReason, setFailReason] = useState("");

  // Ref pour toujours appeler la dernière version d'onDone sans re-déclencher l'effet
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });
  const onNotClothingRef = useRef(onNotClothing);
  useEffect(() => { onNotClothingRef.current = onNotClothing; });

  // Animation cosmétique de la checklist
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Cycling loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % ANALYSE_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Appel IA réel : étiquette (marque/taille/matière) + face avant (style/condition/desc)
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    // Compresse une dataUrl vers max 1024px, JPEG 0.82 — réduit 4MB → ~200KB
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
        img.onerror = () => resolve(dataUrl); // fallback si erreur
        img.src = dataUrl;
      });
    }

    async function run() {
      let analysisData: Partial<Analysis> = {};
      let isNotClothing = false;
      try {
        const [compFront, compLabel] = await Promise.all([
          photos.front  ? compress(photos.front)  : Promise.resolve(null),
          photos.label  ? compress(photos.label)  : Promise.resolve(null),
        ]);

        const res = await fetch("/api/analyze-clothing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front: compFront, label: compLabel }),
        });
        const data = await res.json();
        console.log("[AI] résultat brut:", data);
        if (res.status === 422 && data.error === 'not_clothing') {
          isNotClothing = true;
          if (!cancelled) onNotClothingRef.current();
        } else if (res.status === 422 && data.error === 'invalid_image') {
          if (!cancelled) {
            setFailed(true);
            setFailReason(data.reason || "Image not readable — fill in manually.");
          }
        } else if (res.ok) {
          analysisData = {
            title:        data.title        || "",
            category:     data.category     || "",
            size:         data.size         || "",
            color:        data.color        || "",
            condition:    data.condition    || "",
            brand:        data.brand        || "",
            material:     data.material     || "",
            style:        data.style        || "",
            description:  data.description  || "",
            coins_value:  typeof data.coins_value === 'number' ? data.coins_value : null,
            fake_warning: data.fake_warning === true,
            fake_reason:  data.fake_reason  || null,
          };
        } else {
          if (!cancelled) { console.error("AI error:", data); setFailed(true); }
        }
      } catch (e) {
        if (!cancelled) { console.error(e); setFailed(true); }
      } finally {
        if (!isNotClothing) {
          const wait = Math.max(0, 1800 - (Date.now() - started));
          setTimeout(() => { if (!cancelled) onDoneRef.current(analysisData); }, wait);
        }
      }
    }
    run();
    return () => { cancelled = true; };
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
      <p style={{ textAlign: "center", fontWeight: 600, color: "#2A2A2A", margin: "0 0 20px", transition: "opacity 0.3s", minHeight: 22 }}>{ANALYSE_MESSAGES[msgIdx]}</p>

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

/* Calcule les coins selon la formule officielle (fallback si l'IA ne renvoie pas coins_value) */
function calculateCoins(condition: string, brand: string, category: string): number {
  // Base par catégorie
  const cat = category.toLowerCase();
  let base = 20;
  if (cat.includes("outerwear") || cat.includes("jacket") || cat.includes("coat")) base = 40;
  else if (cat.includes("shoes") || cat.includes("sneakers") || cat.includes("boots")) base = 35;
  else if (cat.includes("dress")) base = 30;
  else if (cat.includes("bottom") || cat.includes("jeans") || cat.includes("pant")) base = 25;
  else if (cat.includes("sport")) base = 25;
  else if (cat.includes("accessori") || cat.includes("bag") || cat.includes("belt")) base = 20;

  // Multiplicateur marque
  const b = brand.toLowerCase();
  let brandMult = 1.0;
  const luxury = ["gucci","louis vuitton","lv","prada","balenciaga","off-white","dior","versace","moncler","ysl","saint laurent","bottega","fendi"];
  const premium = ["ralph lauren","tommy hilfiger","calvin klein","hugo boss","lacoste","burberry","armani","boss"];
  const popular = ["nike","adidas","zara","h&m","levi","north face","stone island","carhartt","new balance","puma","reebok","jordan","converse","vans","champion"];
  const fastFashion = ["primark","shein","boohoo","forever 21","asos","prettylittlething","missguided"];
  if (luxury.some(l => b.includes(l))) brandMult = 4.0;
  else if (premium.some(p => b.includes(p))) brandMult = 2.5;
  else if (popular.some(p => b.includes(p))) brandMult = 1.8;
  else if (fastFashion.some(f => b.includes(f))) brandMult = 0.8;

  // Multiplicateur état
  const c = condition.toLowerCase();
  let condMult = 1.0;
  if (c === "new") condMult = 2.0;
  else if (c === "like_new") condMult = 1.6;
  else if (c === "good") condMult = 1.2;
  else if (c === "used") condMult = 0.8;
  else if (c === "worn") condMult = 0.5;

  return Math.min(500, Math.max(5, Math.round(base * brandMult * condMult)));
}

/* ===== ÉTAPE 3 — VERIFY ===== */
function StepVerify({ photos, analysis, setAnalysis, onPublished }: {
  photos: Photos;
  analysis: Analysis;
  setAnalysis: (a: Analysis) => void;
  onPublished: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Coins — adjustable ±15% around TRADE suggestion
  const initialSuggested = analysis.coins_value ?? calculateCoins(analysis.condition, analysis.brand, analysis.category);
  const [coinsSuggested] = useState(initialSuggested);
  const [coinsValue, setCoinsValue] = useState(initialSuggested);
  const MIN_COINS = 5;
  const MAX_COINS = 500;
  const clampCoins = (v: number) => Math.min(MAX_COINS, Math.max(MIN_COINS, v));

  // Only front photo is required — back/label are optional but help AI analysis
  const canSubmit = !!photos.front;

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

      const insertData: Record<string, unknown> = {
        user_id:          user.id,
        title:            analysis.title || analysis.category || "Item",
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
      // color — only insert if column exists in DB (avoids crash if not migrated yet)
      if (analysis.color) insertData.color = analysis.color;
      console.log("[upload] inserting:", insertData);

      const { error: dbErr } = await supabase.from("clothing").insert(insertData);
      if (dbErr) {
        console.error("[upload] DB error:", dbErr);
        setError("Database error: " + dbErr.message);
        setSubmitting(false);
        return;
      }
      console.log("[upload] item created successfully");
      onPublished();

    } catch (e) {
      console.error("[upload] unexpected:", e);
      setError("Unexpected error. Check the browser console.");
      setSubmitting(false);
    }
  }

  const aiWorked = !!(analysis.category || analysis.brand || analysis.description);

  return (
    <div style={{ padding: "12px 24px 130px" }}>
      <PhotoRow photos={photos} />

      {/* Statut IA */}
      <div style={{ marginTop: 14, marginBottom: analysis.fake_warning ? 10 : 18, background: aiWorked ? "#d6edd4" : "#f3d3cf", borderRadius: 16, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{aiWorked ? "✅" : "⚠️"}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: aiWorked ? "#2d6a2a" : "#7a2e26" }}>
          {aiWorked
            ? "Fields pre-filled by AI — check and edit if needed."
            : "AI couldn't analyze the photo. Fill in the fields manually."}
        </span>
      </div>

      {/* Alerte contrefaçon */}
      {analysis.fake_warning && (
        <div style={{ marginBottom: 18, background: "#fef3c7", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10, border: "1.5px solid #f59e0b" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#92400e" }}>Warning — possible counterfeit</p>
            {analysis.fake_reason && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>{analysis.fake_reason}</p>
            )}
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#a16207", lineHeight: 1.4 }}>You can still publish, but be honest in your description.</p>
          </div>
        </div>
      )}

      <div>
        <Field label="Title *" value={analysis.title || analysis.category} onChange={(v) => setAnalysis({ ...analysis, title: v })} placeholder="ex: Nike Black Hoodie" />
        <Field label="Brand" value={analysis.brand} onChange={(v) => setAnalysis({ ...analysis, brand: v })} placeholder="ex: Nike" />
        <ChipField label="Size" value={analysis.size} onChange={(v) => setAnalysis({ ...analysis, size: v })} options={SIZES} />
        <ChipField label="Condition" value={analysis.condition} onChange={(v) => setAnalysis({ ...analysis, condition: v })} options={CONDITIONS} />
        <ColorSwatches value={analysis.color} onChange={(v) => setAnalysis({ ...analysis, color: v })} />
        <Field label="Style" value={analysis.style} onChange={(v) => setAnalysis({ ...analysis, style: v })} placeholder="ex: Streetwear" />
        <DescField value={analysis.description} onChange={(v) => setAnalysis({ ...analysis, description: v })} />
      </div>

      {/* Bandeau coins — adjustable ±15% */}
      <div style={{ marginTop: 14, background: "#f0e2b8", borderRadius: 18, padding: "12px 16px" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7a6f5d", marginBottom: 8 }}>
          🪙 Coins value
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setCoinsValue((v) => clampCoins(v - 1))}
            disabled={coinsValue <= MIN_COINS}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: coinsValue <= MIN_COINS ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 22, fontWeight: 800, cursor: coinsValue <= MIN_COINS ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
          >−</button>
          <input
            type="number"
            min={MIN_COINS} max={MAX_COINS}
            value={coinsValue}
            onChange={(e) => setCoinsValue(clampCoins(Number(e.target.value) || MIN_COINS))}
            style={{ flex: 1, height: 40, background: "#fff", border: "1.5px solid #d4b870", borderRadius: 12, textAlign: "center", fontSize: 20, fontWeight: 800, color: "#8a6d2a", outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={() => setCoinsValue((v) => clampCoins(v + 1))}
            disabled={coinsValue >= MAX_COINS}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: coinsValue >= MAX_COINS ? "#c9b98a" : "#3c2f22", color: "#FFC543", fontSize: 22, fontWeight: 800, cursor: coinsValue >= MAX_COINS ? "not-allowed" : "pointer", lineHeight: 1, flexShrink: 0 }}
          >+</button>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🪙</span>
        </div>
        <input
          type="range" min={MIN_COINS} max={MAX_COINS}
          value={coinsValue}
          onChange={(e) => setCoinsValue(Number(e.target.value))}
          style={{ width: "100%", marginTop: 10, accentColor: "#3c2f22" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9a7d3a", marginTop: 2 }}>
          <span>{MIN_COINS} coins</span>
          <span style={{ fontWeight: 700 }}>💡 TRADE suggests {coinsSuggested}</span>
          <span>{MAX_COINS} coins</span>
        </div>
        {analysis.coins_reason && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9a7d3a", lineHeight: 1.4 }}>
            {analysis.coins_reason}
          </p>
        )}
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
          At least a front photo is required
        </p>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "#7a6f5d", fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", height: 46, background: "#fff", border: value ? "1.5px solid #a8c9a8" : "1.5px solid #e0d8cc", borderRadius: 23, padding: "0 16px", fontSize: 15, color: "#2A2A2A", outline: "none", boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", fontFamily: "inherit" }}
      />
    </div>
  );
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Normalize the raw AI color string to our standard list on first render
  const normalized = UPLOAD_COLORS.find((c) => c.name === value)?.name ?? normalizeColor(value);
  const active = normalized || value;
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "#7a6f5d", fontWeight: 600, marginBottom: 8 }}>Color</label>
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
                height: 34, padding: "0 11px 0 7px",
                borderRadius: 17, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: isActive ? "#3c2f22" : "#ede8dc",
                color: isActive ? "#FFC543" : "#3c2f22",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
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
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "#7a6f5d", fontWeight: 600, marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? "" : opt)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
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

function DescField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "#7a6f5d", fontWeight: 600, marginBottom: 4 }}>Description</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="AI-generated description, editable…"
        style={{ width: "100%", background: "#fff", border: value ? "1.5px solid #a8c9a8" : "1.5px solid #e0d8cc", borderRadius: 18, padding: "12px 16px", fontSize: 14, color: "#2A2A2A", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}
      />
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

