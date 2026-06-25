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
    if (isPWA) {
      router.replace("/");
    }
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
        height: "calc(100px + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        flexShrink: 0,
      }}>
        <div style={{ position: "relative", width: 110, height: 60 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} priority />
        </div>
      </div>

      <div style={{ padding: "32px 28px 56px", display: "flex", flexDirection: "column", alignItems: "center" }}>

        <h1 style={{
          fontSize: 30,
          fontWeight: 800,
          color: "#3c2f22",
          textAlign: "center",
          margin: "0 0 10px",
          lineHeight: 1.2,
        }}>
          Install TRADE<br />on your iPhone
        </h1>
        <p style={{
          fontSize: 15,
          color: "#7a6f5d",
          textAlign: "center",
          margin: "0 0 36px",
          lineHeight: 1.55,
        }}>
          Add the app to your home screen for a full-screen experience — no browser bar.
        </p>

        {/* Steps */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
          <Step
            num={1}
            icon={<SafariIcon />}
            title="Open in Safari"
            desc="This page must be opened in Safari (not Chrome or another browser)"
          />
          <Step
            num={2}
            icon={<ShareIcon />}
            title='Tap "Share"'
            desc="The square button with an arrow pointing up, at the bottom of the Safari screen"
          />
          <Step
            num={3}
            icon={<AddHomeIcon />}
            title='"Add to Home Screen"'
            desc='Scroll down in the menu and tap "Add to Home Screen"'
          />
          <Step
            num={4}
            icon={<CheckIcon />}
            title='Tap "Add"'
            desc="TRADE will appear on your home screen just like a real native app"
          />
        </div>

        {/* Tip box */}
        <div style={{
          marginTop: 28,
          background: "rgba(255,197,67,0.15)",
          borderRadius: 20,
          padding: "16px 20px",
          border: "1.5px solid #ffc543",
          width: "100%",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#8a6d2a", lineHeight: 1.5, textAlign: "center", fontWeight: 600 }}>
            💡 Once installed, the app opens full screen with no browser bar — exactly like a native app.
          </p>
        </div>

      </div>

      <div style={{ marginTop: "auto", height: 8, background: "#ffc543", flexShrink: 0 }} />
    </div>
  );
}

function Step({ num, icon, title, desc }: {
  num: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      background: "#fff",
      borderRadius: 22,
      padding: "16px 18px",
      boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        background: "#3c2f22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#FFC543",
            background: "#3c2f22",
            borderRadius: 6,
            padding: "2px 8px",
            flexShrink: 0,
          }}>
            {num}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#3c2f22" }}>{title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#7a6f5d", lineHeight: 1.45 }}>{desc}</p>
      </div>
    </div>
  );
}

function SafariIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2"/>
      <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M15.2 8.8l-1.8 4.8-4.8 1.8 1.8-4.8 4.8-1.8z" fill="#FFC543"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M8.5 7.5L12 4l3.5 3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 11H5.5A1.5 1.5 0 004 12.5v7A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0018.5 11H16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/* "Add to Home Screen" icon — phone with a home screen app grid + plus badge */
function AddHomeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      {/* Phone outline */}
      <rect x="5" y="2" width="14" height="20" rx="3" stroke="#fff" strokeWidth="2"/>
      {/* App grid dots */}
      <circle cx="9" cy="10" r="1.5" fill="#fff" opacity="0.5"/>
      <circle cx="15" cy="10" r="1.5" fill="#fff" opacity="0.5"/>
      <circle cx="9" cy="15" r="1.5" fill="#fff" opacity="0.5"/>
      {/* Plus sign where the new app icon goes */}
      <circle cx="15" cy="15" r="3.5" fill="#FFC543"/>
      <path d="M15 13.5v3M13.5 15h3" stroke="#3c2f22" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke="#FFC543" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
