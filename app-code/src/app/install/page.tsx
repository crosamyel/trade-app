"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function InstallPage() {
  const router = useRouter();

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isPWA) router.replace("/");
  }, [router]);

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
          Add TRADE to your<br />Home Screen
        </h1>
        <p style={{ fontSize: 14, color: "#7a6f5d", textAlign: "center", margin: "0 0 28px", lineHeight: 1.55 }}>
          4 quick steps in Safari — the app will then open full screen, just like a native app.
        </p>

        {/* Steps */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <Step
            num={1}
            icon="🧭"
            title="Open this page in Safari"
            desc="Not in Chrome or another browser — Safari only"
          />
          <Step
            num={2}
            icon="···"
            title='Tap "···" at the bottom right'
            desc="The button with three dots in Safari's navigation bar"
          />
          <Step
            num={3}
            icon="⬆️"
            title='Tap "Share"'
            desc='In the menu that opens, find and tap "Share" (the square icon with an arrow)'
          />
          <Step
            num={4}
            icon="＋"
            title='"Add to Home Screen" → Add'
            desc='Scroll down and tap "Add to Home Screen", then tap "Add"'
          />
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 20, background: "rgba(255,197,67,0.15)", borderRadius: 18,
          padding: "14px 18px", border: "1.5px solid #ffc543", width: "100%",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#8a6d2a", lineHeight: 1.5, textAlign: "center", fontWeight: 600 }}>
            💡 Once installed, TRADE opens full screen with no browser bar — exactly like a native app.
          </p>
        </div>

      </div>

      <div style={{ marginTop: "auto", height: 6, background: "#ffc543", flexShrink: 0 }} />
    </div>
  );
}

function Step({ num, icon, title, desc }: {
  num: number; icon: string; title: string; desc: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      background: "#fff", borderRadius: 20, padding: "14px 16px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      border: "2px solid transparent",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: "#3c2f22",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, fontSize: icon === "···" ? 14 : 20,
        fontWeight: 900, color: "#FFC543",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 800, color: "#FFC543",
            background: "#3c2f22", borderRadius: 5, padding: "2px 7px", flexShrink: 0,
          }}>
            {num}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#3c2f22" }}>{title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#7a6f5d", lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  );
}
