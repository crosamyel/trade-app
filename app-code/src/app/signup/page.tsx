"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [age, setAge]           = useState(false);
  const [tos, setTos]           = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  async function handleSignup() {
    if (loading) return;
    if (!email.trim() || !password || !confirm) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (!age || !tos) { setError("Please accept the conditions"); return; }
    setLoading(true);
    setError("");
    const { data, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
    } else if (data.session) {
      router.push("/home");
      router.refresh();
    } else {
      setError("Check your email to confirm your account.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div style={{
      background: "#f9f4e8", minHeight: "100dvh", fontFamily: FONT,
      width: "100%", position: "relative", display: "flex", flexDirection: "column",
      overflowY: "auto", WebkitOverflowScrolling: "touch",
    }}>

      {/* Header avec safe area */}
      <div style={{
        background: "#3c2f22", width: "100%",
        height: "calc(170px + env(safe-area-inset-top, 0px))",
        borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: 28, boxSizing: "border-box", flexShrink: 0,
      }}>
        <div style={{ position: "relative", width: 120, height: 76 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} priority />
        </div>
      </div>

      {/* Contenu — onClick direct, pas de form submit */}
      <div style={{ padding: "20px 28px 28px", flex: 1, display: "flex", flexDirection: "column" }}>

        <h1 style={{ fontSize: "clamp(26px, 8vw, 34px)", fontWeight: 800, color: "#3c2f22", textAlign: "center", margin: "0 0 24px" }}>
          Sign up
        </h1>

        {error && (
          <p style={{ color: "#e03c3c", textAlign: "center", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <label style={lbl}>E-mail</label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inp}
        />

        <label style={lbl}>Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          style={inp}
        />

        <label style={lbl}>Confirm password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          style={inp}
        />

        {/* Checkboxes RGPD */}
        <label style={chk} onTouchEnd={() => setAge(a => !a)}>
          <input
            type="checkbox" checked={age}
            onChange={e => setAge(e.target.checked)}
            style={{ marginRight: 10, accentColor: "#ffc543", width: 20, height: 20, flexShrink: 0 }}
          />
          I am at least <strong style={{ marginLeft: 4 }}>16 years old</strong>
        </label>
        <label style={chk} onTouchEnd={() => setTos(t => !t)}>
          <input
            type="checkbox" checked={tos}
            onChange={e => setTos(e.target.checked)}
            style={{ marginRight: 10, accentColor: "#ffc543", width: 20, height: 20, flexShrink: 0 }}
          />
          I accept the{" "}
          <a href="#" style={{ color: "#3c2f22", fontWeight: 700, textDecoration: "underline" }}>Terms</a>
          {" "}and{" "}
          <a href="#" style={{ color: "#3c2f22", fontWeight: 700, textDecoration: "underline" }}>Privacy Policy</a>
        </label>

        {/* Séparateur */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#3c2f22", opacity: 0.2 }} />
          <span style={{ fontSize: 14, fontStyle: "italic", color: "#3c2f22" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#3c2f22", opacity: 0.2 }} />
        </div>

        {/* Boutons sociaux */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onTouchEnd={(e) => { e.preventDefault(); handleGoogle(); }}
            onClick={handleGoogle}
            style={socialBtn}
          ><GoogleIcon /></button>
          <button type="button" style={socialBtn}><FacebookIcon /></button>
        </div>

        <div style={{ flex: 1, minHeight: 20 }} />

        {/* Bouton Sign up */}
        <button
          type="button"
          disabled={loading}
          onTouchEnd={(e) => { e.preventDefault(); handleSignup(); }}
          onClick={handleSignup}
          style={{
            width: "100%", height: 56, background: "#3c2f22",
            border: "none", borderRadius: 28,
            color: "#ffc543", fontSize: 18, fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: 20,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          } as React.CSSProperties}
        >
          {loading ? "Loading..." : "Sign up"}
        </button>

        <p style={{ textAlign: "center", fontSize: 14, color: "#3c2f22", margin: "0 0 16px" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ fontWeight: 800, color: "#3c2f22", textDecoration: "none" }}>
            Sign in
          </Link>
        </p>

      </div>

      {/* Accent jaune */}
      <div style={{ flexShrink: 0, height: 8, background: "#ffc543" }} />
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: "block", fontWeight: 700, fontSize: 14,
  color: "#3c2f22", marginBottom: 8,
};
const inp: React.CSSProperties = {
  display: "block", width: "100%", height: 52,
  background: "#ede8dc", border: "none", borderRadius: 26,
  padding: "0 20px", fontSize: 16, color: "#3c2f22",
  outline: "none", boxSizing: "border-box", marginBottom: 20,
  WebkitAppearance: "none",
};
const chk: React.CSSProperties = {
  display: "flex", alignItems: "center",
  fontSize: 13, color: "#3c2f22", marginBottom: 12,
  cursor: "pointer", lineHeight: 1.5,
  touchAction: "manipulation",
};
const socialBtn: React.CSSProperties = {
  flex: 1, height: 52, background: "#ede8dc",
  border: "none", borderRadius: 26,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", touchAction: "manipulation",
};

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#1877F2"/>
      <path d="M13.5 8.5h2V6h-2c-1.93 0-3.5 1.57-3.5 3.5V11H8v2.5h2V21h2.5v-7.5H15l.5-2.5h-3V9.5c0-.55.45-1 1-1z" fill="white"/>
    </svg>
  );
}
