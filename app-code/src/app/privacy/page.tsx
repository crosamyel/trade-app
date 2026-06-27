"use client";

import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const SECTIONS = [
  {
    title: "1. Data We Collect",
    intro: "When you use TRADE.app, we collect:",
    bullets: [
      "Account information: email address, username, city, bio",
      "Profile photos and clothing photos you upload",
      "Trade activity: likes, matches, messages, ratings",
      "Device information: browser type, IP address (collected automatically by our hosting provider Vercel)",
    ],
  },
  {
    title: "2. How We Use Your Data",
    intro: "We use your data to:",
    bullets: [
      "Provide and improve the TRADE.app service",
      "Show your profile and listings to other users",
      "Send notifications about matches, messages, and trades",
      "Detect fraud and ensure platform safety",
    ],
  },
  {
    title: "3. Data Storage",
    body: "Your data is stored on Supabase, which uses servers located in the European Union. We do not store your data outside the EU.",
  },
  {
    title: "4. Data Sharing",
    intro: "We do not sell your personal data to third parties. We share data only with:",
    bullets: [
      "Supabase (database and authentication provider)",
      "Vercel (hosting provider)",
      "OpenAI (clothing photo analysis only — photos are processed and not stored by OpenAI)",
      "Stripe (payment processing — only when you purchase coins)",
    ],
  },
  {
    title: "5. Your Rights (GDPR)",
    intro: "Under GDPR, you have the right to:",
    bullets: [
      "Access your personal data",
      "Correct inaccurate data",
      "Request deletion of your account and all associated data",
      "Object to certain uses of your data",
    ],
    footer: "To exercise these rights, contact us at: crosamyel@gmail.com",
  },
  {
    title: "6. Account Deletion",
    body: "You can request deletion of your account and all your data by contacting us at crosamyel@gmail.com. We will process your request within 30 days.",
  },
  {
    title: "7. Cookies",
    body: "TRADE.app uses only essential cookies for authentication. We do not use tracking or advertising cookies.",
  },
  {
    title: "8. Changes to This Policy",
    body: "We may update this privacy policy from time to time. We will notify users of significant changes via the app.",
  },
  {
    title: "9. Contact",
    body: "Data controller: Samyel Crokaert — crosamyel@gmail.com",
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#f9f4e8", fontFamily: FONT, minHeight: "100dvh" }}>
      {/* Header */}
      <div style={{
        background: "#3c2f22",
        paddingTop: "max(20px, calc(env(safe-area-inset-top, 0px) + 14px))",
        paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        position: "relative",
      }}>
        <button
          onClick={() => router.back()}
          style={{ position: "absolute", left: 18, top: "max(20px, calc(env(safe-area-inset-top, 0px) + 14px))", width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#FFC543" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ margin: "36px 0 4px", fontSize: 24, fontWeight: 800, fontStyle: "italic", color: "#FFC543", textAlign: "center" }}>Privacy Policy</h1>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>Last updated: June 2026</p>
      </div>

      <div style={{ padding: "24px 20px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#7a6f5d", lineHeight: 1.6, fontStyle: "italic" }}>
          Your privacy matters to us. This policy explains what data we collect and how we use it.
        </p>

        {SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: 20, background: "#fff", borderRadius: 20, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#3c2f22" }}>{s.title}</h2>
            {s.body && <p style={{ margin: 0, fontSize: 14, color: "#5d5347", lineHeight: 1.65 }}>{s.body}</p>}
            {s.intro && <p style={{ margin: "0 0 8px", fontSize: 14, color: "#5d5347", lineHeight: 1.65 }}>{s.intro}</p>}
            {s.bullets && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {s.bullets.map((b, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, marginBottom: i < s.bullets!.length - 1 ? 7 : 0 }}>
                    <span style={{ color: "#FFC543", fontWeight: 800, flexShrink: 0, fontSize: 13 }}>—</span>
                    <span style={{ fontSize: 14, color: "#5d5347", lineHeight: 1.6 }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.footer && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9b8f7a", fontStyle: "italic" }}>{s.footer}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
