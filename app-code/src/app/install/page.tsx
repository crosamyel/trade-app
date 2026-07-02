"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function InstallPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isPWA) router.replace("/");
  }, [router]);

  // Auto-avance le step actif pour l'animation
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "#f9f4e8",
      minHeight: "100dvh",
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      {/* Header */}
      <div style={{
        background: "#3c2f22",
        height: "calc(90px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28, flexShrink: 0,
      }}>
        <div style={{ position: "relative", width: 100, height: 52 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} priority />
        </div>
      </div>

      <div style={{ padding: "28px 24px 56px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#3c2f22", textAlign: "center", margin: "0 0 8px", lineHeight: 1.2 }}>
          Ajoute TRADE<br />sur ton écran d'accueil
        </h1>
        <p style={{ fontSize: 14, color: "#7a6f5d", textAlign: "center", margin: "0 0 28px", lineHeight: 1.55 }}>
          4 étapes rapides dans Safari — l'app s'ouvre ensuite en plein écran comme une vraie app native.
        </p>

        {/* Illustration Safari bottom bar */}
        <SafariMockup activeStep={activeStep} />

        {/* Steps */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <Step
            num={1}
            active={activeStep === 0}
            icon="🧭"
            title="Ouvre cette page dans Safari"
            desc="Pas dans Chrome ou un autre navigateur — uniquement Safari"
          />
          <Step
            num={2}
            active={activeStep === 1}
            icon="···"
            title='Appuie sur "···" en bas à droite'
            desc="Le bouton avec trois points dans la barre de navigation de Safari"
          />
          <Step
            num={3}
            active={activeStep === 2}
            icon="⬆️"
            title='Appuie sur "Partager"'
            desc='Dans le menu qui s\'ouvre, trouve et appuie sur "Partager" (icône carré avec flèche)'
          />
          <Step
            num={4}
            active={activeStep === 3}
            icon="＋"
            title='"Sur l\'écran d\'accueil" → Ajouter'
            desc='Fais défiler vers le bas et appuie sur "Sur l\'écran d\'accueil", puis "Ajouter"'
          />
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 20, background: "rgba(255,197,67,0.15)", borderRadius: 18,
          padding: "14px 18px", border: "1.5px solid #ffc543", width: "100%",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#8a6d2a", lineHeight: 1.5, textAlign: "center", fontWeight: 600 }}>
            💡 Une fois installée, TRADE s'ouvre en plein écran sans barre de navigateur — exactement comme une app native.
          </p>
        </div>

      </div>

      <div style={{ marginTop: "auto", height: 6, background: "#ffc543", flexShrink: 0 }} />
    </div>
  );
}

/* Illustration animée du bas de Safari */
function SafariMockup({ activeStep }: { activeStep: number }) {
  return (
    <div style={{ width: "100%", maxWidth: 340 }}>
      {/* Fond "écran de téléphone" */}
      <div style={{
        background: "#1c1c1e",
        borderRadius: 20,
        overflow: "hidden",
        border: "2px solid #3a3a3c",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      }}>

        {/* Fausse barre d'adresse Safari */}
        <div style={{
          background: "#2c2c2e", padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ flex: 1, background: "#3a3a3c", borderRadius: 8, padding: "5px 10px" }}>
            <span style={{ fontSize: 11, color: "#8e8e93" }}>tradebe.app</span>
          </div>
        </div>

        {/* Contenu de la page (simulé) */}
        <div style={{
          background: "#f9f4e8", padding: "16px 14px", minHeight: 80,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ height: 8, background: "#e8e0d0", borderRadius: 4, width: "70%" }} />
          <div style={{ height: 6, background: "#e8e0d0", borderRadius: 4, width: "50%" }} />
          <div style={{ height: 6, background: "#e8e0d0", borderRadius: 4, width: "60%" }} />
        </div>

        {/* Barre de navigation Safari en bas */}
        <div style={{
          background: "#2c2c2e",
          padding: "6px 10px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Boutons nav gauche */}
          <div style={{ display: "flex", gap: 20 }}>
            <NavBtn icon="‹" />
            <NavBtn icon="›" />
          </div>

          {/* Bouton Share au centre */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: activeStep === 2 ? "#ffc543" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.3s",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v11" stroke={activeStep === 2 ? "#3c2f22" : "#8e8e93"} strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M8.5 7.5L12 4l3.5 3.5" stroke={activeStep === 2 ? "#3c2f22" : "#8e8e93"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 11H5.5A1.5 1.5 0 004 12.5v7A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0018.5 11H16" stroke={activeStep === 2 ? "#3c2f22" : "#8e8e93"} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            {activeStep === 2 && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                transform: "translateX(-50%)",
                background: "#ffc543", color: "#3c2f22", fontSize: 10, fontWeight: 800,
                borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap",
              }}>
                Partager ↑
              </div>
            )}
          </div>

          {/* Boutons nav droite */}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <NavBtn icon="⊞" />

            {/* Bouton ··· — c'est lui qu'on cherche */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: activeStep === 1 ? "#ffc543" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.3s",
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 900, letterSpacing: 1,
                  color: activeStep === 1 ? "#3c2f22" : "#8e8e93",
                  lineHeight: 1,
                }}>···</span>
              </div>
              {/* Flèche indicatrice */}
              {activeStep === 1 && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", right: 0,
                  background: "#ffc543", color: "#3c2f22", fontSize: 10, fontWeight: 800,
                  borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap",
                }}>
                  Appuie ici ↓
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Caption sous le mockup */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#9a8e7d", margin: "8px 0 0" }}>
        {activeStep === 0 && "Ouvre tradebe.app dans Safari"}
        {activeStep === 1 && "Appuie sur ··· en bas à droite"}
        {activeStep === 2 && "Puis appuie sur Partager"}
        {activeStep === 3 && "Puis : Sur l'écran d'accueil → Ajouter"}
      </p>
    </div>
  );
}

function NavBtn({ icon }: { icon: string }) {
  return (
    <div style={{
      width: 32, height: 32, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#8e8e93", fontSize: 18, fontWeight: 300,
    }}>
      {icon}
    </div>
  );
}

function Step({ num, active, icon, title, desc }: {
  num: number; active: boolean; icon: string; title: string; desc: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      background: active ? "#3c2f22" : "#fff",
      borderRadius: 20, padding: "14px 16px",
      boxShadow: active ? "0 4px 20px rgba(60,47,34,0.18)" : "0 2px 10px rgba(0,0,0,0.05)",
      transition: "all 0.3s ease",
      border: active ? "2px solid #ffc543" : "2px solid transparent",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: active ? "#ffc543" : "#f0ebe2",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: icon === "···" ? 14 : 20,
        fontWeight: 900, color: active ? "#3c2f22" : "#7a6f5d",
        transition: "all 0.3s ease",
      }}>
        {icon === "···" ? "···" : icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: active ? "#ffc543" : "#FFC543",
            background: active ? "rgba(255,197,67,0.2)" : "#3c2f22",
            borderRadius: 5, padding: "2px 7px", flexShrink: 0,
          }}>
            {num}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: active ? "#ffc543" : "#3c2f22" }}>{title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: active ? "#d4c4a0" : "#7a6f5d", lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  );
}
