"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Avec flowType "implicit", Supabase place les tokens dans le #hash.
// Le client les détecte automatiquement — on attend juste la session.
function CallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    let done = false;

    function goHome() {
      if (done) return;
      done = true;
      router.replace("/home");
    }

    // Supabase traite le hash automatiquement et émet SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) goHome();
    });

    // Vérifie si la session est déjà là (cas refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) goHome();
    });

    // Fallback 10s → login si rien ne marche
    const timer = setTimeout(() => {
      if (!done) { done = true; router.replace("/login"); }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div style={{
      background: "#f9f4e8", height: "100dvh", width: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 20,
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "4px solid #FFC543", borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#3c2f22", fontSize: 15, fontWeight: 500 }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ background: "#f9f4e8", height: "100dvh" }} />}>
      <CallbackHandler />
    </Suspense>
  );
}
