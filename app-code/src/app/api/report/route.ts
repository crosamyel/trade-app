import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { matchId, reporterName, reason, chatLink } = await req.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set — skipping email alert");
      return NextResponse.json({ success: true, warning: "Email not sent (no API key)" });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TRADE.app <onboarding@resend.dev>",
        to: "crosamyel@gmail.com",
        subject: `⚠️ Trade dispute reported — ${matchId}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#3c2f22">⚠️ Trade Dispute Reported</h2>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
              <tr><td style="padding:8px 0;color:#888;width:140px">Match ID</td><td style="padding:8px 0;font-weight:600">${matchId}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Reported by</td><td style="padding:8px 0;font-weight:600">${reporterName}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Reason</td><td style="padding:8px 0;font-weight:600">${reason}</td></tr>
            </table>
            <div style="margin-top:24px;display:flex;gap:12px">
              <a href="https://app-code-two.vercel.app${chatLink}" style="display:inline-block;padding:10px 20px;background:#3c2f22;color:#FFC543;text-decoration:none;border-radius:8px;font-weight:700;margin-right:12px">View Chat</a>
              <a href="https://app-code-two.vercel.app/admin" style="display:inline-block;padding:10px 20px;background:#FFC543;color:#3c2f22;text-decoration:none;border-radius:8px;font-weight:700">Open Admin</a>
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error:", text);
      return NextResponse.json({ error: "Email failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("report route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
