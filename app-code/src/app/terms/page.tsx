"use client";

import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const SECTIONS = [
  {
    title: "1. About TRADE.app",
    body: "TRADE.app is a peer-to-peer clothing exchange platform. Users can upload clothing items and trade them with other users without money exchanging hands. Coins are a virtual in-app currency used to facilitate exchanges.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 16 years old to use TRADE.app. By creating an account, you confirm that you meet this requirement.",
  },
  {
    title: "3. User Responsibilities",
    bullets: [
      "You are responsible for the accuracy of your listings. Photos and descriptions must honestly represent the item.",
      "You must only list items that you own and have the right to trade.",
      "You must complete trades that you have accepted. Repeated cancellations may result in account suspension.",
      "You must treat other users with respect. Harassment, fraud, or abuse will result in immediate account termination.",
    ],
  },
  {
    title: "4. Prohibited Items",
    body: "The following items may not be listed on TRADE.app: counterfeit or fake branded goods, stolen items, items that are damaged beyond what is described, underwear or swimwear (for hygiene reasons), any item that violates Belgian or EU law.",
  },
  {
    title: "5. Trades and Shipping",
    body: "TRADE.app facilitates the connection between users but is not a party to any trade. TRADE.app is not responsible for items that are lost, damaged, or not as described during shipping. Users are encouraged to use tracked shipping and to take photos of items before sending.",
  },
  {
    title: "6. Coins",
    body: "Coins are a virtual in-app currency. They have no monetary value outside of TRADE.app and cannot be refunded once purchased, except as required by Belgian consumer law. Coins are non-transferable between accounts.",
  },
  {
    title: "7. Content",
    body: "By uploading photos to TRADE.app, you grant TRADE.app a non-exclusive license to display those photos within the app. You retain ownership of your photos.",
  },
  {
    title: "8. Account Termination",
    body: "TRADE.app reserves the right to suspend or terminate any account that violates these terms, without prior notice.",
  },
  {
    title: "9. Limitation of Liability",
    body: 'TRADE.app is provided "as is". We do not guarantee uninterrupted service. To the maximum extent permitted by law, TRADE.app is not liable for any indirect or consequential damages.',
  },
  {
    title: "10. Contact",
    body: "For any questions: crosamyel@gmail.com",
  },
];

export default function TermsPage() {
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
        <h1 style={{ margin: "36px 0 4px", fontSize: 24, fontWeight: 800, fontStyle: "italic", color: "#FFC543", textAlign: "center" }}>Terms of Service</h1>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }}>Last updated: June 2026</p>
      </div>

      <div style={{ padding: "24px 20px calc(40px + env(safe-area-inset-bottom, 0px))" }}>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#7a6f5d", lineHeight: 1.6, fontStyle: "italic" }}>
          Welcome to TRADE.app. By using our app, you agree to the following terms. Please read them carefully.
        </p>

        {SECTIONS.map((s) => (
          <div key={s.title} style={{ marginBottom: 20, background: "#fff", borderRadius: 20, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "#3c2f22" }}>{s.title}</h2>
            {s.body && (
              <p style={{ margin: 0, fontSize: 14, color: "#5d5347", lineHeight: 1.65 }}>{s.body}</p>
            )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
