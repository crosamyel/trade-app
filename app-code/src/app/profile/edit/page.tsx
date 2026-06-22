"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MAX_BIO = 100;

export default function EditProfilePage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      try {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof?.city) setCity(prof.city);
        if (prof?.bio) setBio(prof.bio);
      } catch { /* profiles unavailable */ }
    }
    init();
  }, [router]);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }
    const { error } = await supabase.from("profiles").update({ city, bio }).eq("id", user.id);
    if (error) { console.error("save error:", error); setSaving(false); return; }
    router.push("/profile");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F9F4E8", fontFamily: FONT }}>
      {/* Header */}
      <div style={{
        position: "relative", background: "#3c2f22", flexShrink: 0,
        height: "calc(112px + env(safe-area-inset-top, 0px))",
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: 18, paddingRight: 18, paddingBottom: 16,
      }}>
        <button onClick={() => router.back()} style={{ position: "absolute", left: 14, bottom: 12, width: 38, height: 38, borderRadius: "50%", background: "#2D1A0A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span style={{ color: "#FFC543", fontWeight: 800, fontSize: 22 }}>Edit profile</span>
      </div>

      <div style={{ flex: 1, padding: "26px 20px" }}>
        {/* City */}
        <label style={lbl}>Your city</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Brussels"
          style={inp}
        />

        {/* Bio */}
        <label style={{ ...lbl, marginTop: 22 }}>Your bio</label>
        <div style={{ position: "relative" }}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder="e.g. I would like to trade clothes, what do you got?"
            rows={4}
            style={{ ...inp, height: "auto", padding: "14px 18px 26px", resize: "none", lineHeight: 1.5 }}
          />
          <span style={{ position: "absolute", right: 14, bottom: 10, fontSize: 12, color: "rgba(45,26,10,0.5)" }}>
            {bio.length}/{MAX_BIO}
          </span>
        </div>
      </div>

      {/* Save */}
      <div style={{ flexShrink: 0, padding: "12px 20px 24px" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ width: "100%", height: 54, borderRadius: 27, border: "none", background: "#2D1A0A", color: "#FFC543", fontWeight: 800, fontSize: 17, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontSize: 14, fontWeight: 700, color: "#2D1A0A", marginBottom: 8,
};
const inp: React.CSSProperties = {
  display: "block", width: "100%", height: 50, background: "#E8E4DC", border: "none", borderRadius: 16,
  padding: "0 18px", fontSize: 15, color: "#2D1A0A", outline: "none", boxSizing: "border-box",
  fontFamily: FONT,
};
