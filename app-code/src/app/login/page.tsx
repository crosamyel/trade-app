"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (loading) return;
    console.log("[Login] handleLogin triggered");
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    console.log("[Login] calling signInWithPassword for:", email.trim());
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    console.log("[Login] response →", { session: data?.session?.user?.email ?? null, error: authErr?.message ?? null });
    if (authErr) {
      console.error("[Login] auth error:", authErr);
      setError(authErr.message);
      setLoading(false);
    } else {
      console.log("[Login] success — navigating to /home");
      router.push("/home");
      router.refresh();
    }
  }

  async function handleGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("Google: " + error.message);
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError("Enter your email above first."); return; }
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
  }

  async function handleFacebook() {
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
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
        height: "calc(126px + max(env(safe-area-inset-top, 0px), 44px))",
        borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingTop: "max(env(safe-area-inset-top, 0px), 44px)",
        paddingBottom: 28, boxSizing: "border-box", flexShrink: 0,
      }}>
        <div style={{ position: "relative", width: 120, height: 76 }}>
          <Image src="/trade-logo-main.png" alt="TRADE" fill style={{ objectFit: "contain" }} priority />
        </div>
      </div>

      {/* Contenu — pas de form, onClick direct sur bouton */}
      <div style={{ padding: "20px 28px 28px", flex: 1, display: "flex", flexDirection: "column" }}>

        <h1 style={{ fontSize: "clamp(26px, 8vw, 34px)", fontWeight: 800, color: "#3c2f22", textAlign: "center", margin: "0 0 24px" }}>
          Sign in
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
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          placeholder="••••••••"
          style={{ ...inp, marginBottom: 0 }}
        />

        {resetSent ? (
          <p style={{ fontSize: 13, color: "#5d8f3c", fontWeight: 600, textAlign: "right", marginTop: 10, marginBottom: 24 }}>
            ✓ Reset link sent — check your email
          </p>
        ) : (
          <button type="button" onClick={handleForgotPassword} style={{
            display: "block", textAlign: "right", fontSize: 13, width: "100%",
            color: "#3c2f22", textDecoration: "underline",
            marginTop: 10, marginBottom: 24, background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            Forgot password?
          </button>
        )}

        {/* Séparateur */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 20px" }}>
          <div style={{ flex: 1, height: 1, background: "#3c2f22", opacity: 0.2 }} />
          <span style={{ fontSize: 14, fontStyle: "italic", color: "#3c2f22" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#3c2f22", opacity: 0.2 }} />
        </div>

        {/* Boutons sociaux */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onTouchEnd={(e) => { e.preventDefault(); handleGoogle(); }}
            onClick={handleGoogle}
            style={socialBtn}
          >
            <GoogleIcon />
          </button>
          <button
            type="button"
            onTouchEnd={(e) => { e.preventDefault(); handleFacebook(); }}
            onClick={handleFacebook}
            style={socialBtn}
          >
            <FacebookIcon />
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bouton Sign in — onClick + onTouchEnd pour iOS fiabilité maximale */}
        <button
          type="button"
          disabled={loading}
          onTouchEnd={(e) => { e.preventDefault(); handleLogin(); }}
          onClick={handleLogin}
          style={{
            width: "100%", height: 56, background: "#3c2f22",
            border: "none", borderRadius: 28,
            color: "#FFC543", fontSize: 18, fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: 20,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          } as React.CSSProperties}
        >
          {loading ? "Loading..." : "Sign in"}
        </button>

        <p style={{ textAlign: "center", fontSize: 14, color: "#3c2f22", margin: 0 }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ fontWeight: 800, color: "#3c2f22", textDecoration: "none" }}>
            Sign up
          </Link>
        </p>

      </div>

      {/* Accent jaune */}
      <div style={{ flexShrink: 0, height: 8, background: "#FFC543" }} />
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
