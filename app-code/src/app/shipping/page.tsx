"use client";

import { useRouter } from "next/navigation";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const CARRIERS = [
  { name: "bpost Pakket", best: "Belgium only", price: "~€5–8" },
  { name: "bpost International", best: "Europe", price: "~€12–18" },
  { name: "DHL Express", best: "Fast, Europe + world", price: "~€15–25" },
  { name: "PostNL", best: "Netherlands + Europe", price: "~€8–15" },
];

const TIPS = [
  "Drop off at any bpost point — find your nearest one at bpost.be",
  "Keep your receipt from the post office until the trade is confirmed complete",
  "If you're shipping shoes, use the original box if available",
  "For delicate items, add bubble wrap",
];

export default function ShippingPage() {
  const router = useRouter();

  return (
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#F9F4E8", fontFamily: FONT, minHeight: "100dvh" }}>
      {/* Header */}
      <div style={{
        background: "#3c2f22",
        paddingTop: "max(20px, calc(env(safe-area-inset-top, 0px) + 14px))",
        paddingBottom: 24, paddingLeft: 20, paddingRight: 20,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: "relative",
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 18, top: "max(20px, calc(env(safe-area-inset-top, 0px) + 14px))", width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#FFC543" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <h1 style={{ margin: "36px 0 4px", fontSize: 26, fontWeight: 800, fontStyle: "italic", color: "#FFC543", textAlign: "center" }}>How to ship</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Everything you need to complete your trade</p>
      </div>

      <div style={{ padding: "24px 18px 120px" }}>

        {/* Step 1 */}
        <Step num={1} title="Pack your item carefully">
          <Tips items={["Fold your item neatly", "Wrap it in a plastic bag to protect from moisture", "Place it in a padded envelope or small cardboard box", "Do not use bags that can tear easily"]} />
        </Step>

        {/* Step 2 */}
        <Step num={2} title="Write the address clearly">
          <Tips items={["Use the address shown in your chat after the trade was accepted", "Write it clearly on the outside of the package", "Add your own return address on the back"]} />
        </Step>

        {/* Step 3 — carrier table */}
        <Step num={3} title="Choose your carrier">
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#5d8f3c", fontWeight: 700, lineHeight: 1.4 }}>
            💡 Always choose tracked shipping. If the other person claims they never received it, you can prove delivery with the tracking number.
          </p>
          <div style={{ overflowX: "auto", borderRadius: 12, overflow: "hidden", border: "1px solid #ede8dc" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#ede8dc" }}>
                  {["Carrier", "Best for", "Price", "Tracking"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#7a6f5d", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CARRIERS.map((c, i) => (
                  <tr key={c.name} style={{ background: i % 2 === 0 ? "#fff" : "#faf7f1" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: "#2D1A0A", whiteSpace: "nowrap" }}>{c.name}</td>
                    <td style={{ padding: "9px 10px", color: "#7a6f5d" }}>{c.best}</td>
                    <td style={{ padding: "9px 10px", color: "#2D1A0A", fontWeight: 600, whiteSpace: "nowrap" }}>{c.price}</td>
                    <td style={{ padding: "9px 10px", color: "#5d8f3c", fontWeight: 800 }}>✓</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Step>

        {/* Step 4 */}
        <Step num={4} title="Share your tracking number">
          <Tips items={["After dropping off the package, go back to the chat and send your tracking number as a message.", "This builds trust and lets the other person follow the delivery."]} />
        </Step>

        {/* Step 5 */}
        <Step num={5} title="Confirm in the app">
          <Tips items={['Tap "📦 I shipped my item" in the chat.', 'Once both of you have confirmed shipping, the "✅ I received my item" button will appear.']} />
        </Step>

        {/* Tips */}
        <div style={{ marginBottom: 18, background: "#3c2f22", borderRadius: 22, padding: "18px 18px 16px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: "#FFC543" }}>Shipping tips</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {TIPS.map((tip, i) => (
              <li key={i} style={{ display: "flex", gap: 8, marginBottom: i < TIPS.length - 1 ? 8 : 0 }}>
                <span style={{ color: "#FFC543", flexShrink: 0 }}>•</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Report a problem */}
        <div style={{ background: "#fff3e0", borderRadius: 22, padding: "16px 18px", border: "1.5px solid #FFC543" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#8a6d2a" }}>⚠️ What if there&apos;s a problem?</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#7a6f5d", lineHeight: 1.6 }}>
            If you receive the wrong item or the item doesn&apos;t match the description, tap <strong>&quot;Report a problem&quot;</strong> in the chat <strong>within 48 hours</strong> of receiving your package.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18, background: "#fff", borderRadius: 22, padding: "18px 18px 16px", boxShadow: "0 3px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#FFC543", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#2D1A0A" }}>{num}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#2D1A0A" }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Tips({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((tip, i) => (
        <li key={i} style={{ display: "flex", gap: 8, marginBottom: i < items.length - 1 ? 6 : 0 }}>
          <span style={{ color: "#FFC543", fontWeight: 800, flexShrink: 0 }}>—</span>
          <span style={{ fontSize: 14, color: "#7a6f5d", lineHeight: 1.5 }}>{tip}</span>
        </li>
      ))}
    </ul>
  );
}
