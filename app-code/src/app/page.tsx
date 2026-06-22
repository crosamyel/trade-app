"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/* ---------------------------------------------------------------
   Start page — affiché uniquement la première fois.
   Les visites suivantes redirigent vers /login ou /home.
--------------------------------------------------------------- */

export default function StartPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      // getSession() lit depuis localStorage → instantané, pas de réseau
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { router.replace("/home"); return; }
      if (localStorage.getItem("trade_onboarded")) {
        router.replace("/login");
        return;
      }
      setReady(true);
    }
    check();
  }, [router]);

  if (!ready) {
    return <div style={{ background: "#f9f4e8", height: "100dvh", width: "100%" }} />;
  }

  return (
    <div
      className="relative overflow-hidden bg-[#f9f4e8]"
      style={{
        width: "100%",
        height: "100dvh",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* ── Ligne de soulignement jaune sous "Trade" ── */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 13, top: 106, width: 132, height: 14 }}
      >
        <Image src="/deco-underline.png" alt="" fill className="object-contain" />
      </div>

      {/* ── Scribble jaune ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "19%",
          top: "23.8%",
          width: 101,
          height: 71,
          transform: "rotate(11.83deg)",
        }}
      >
        <Image src="/deco-burst.png" alt="" fill className="object-contain" />
      </div>

      {/* ── Texte ── */}
      <div
        className="absolute"
        style={{
          top: "7.09%",
          left: "3.3%",
          right: "11.76%",
          transform: "rotate(-1.72deg)",
          transformOrigin: "left center",
        }}
      >
        <p style={{ fontSize: "clamp(30px, 11.5vw, 45px)", fontWeight: 800, lineHeight: 1.08, color: "#3c2f22" }}>
          <em style={{ fontStyle: "italic" }}>Trade</em>
          {" what you don't use."}
        </p>
      </div>

      <div
        className="absolute text-right"
        style={{
          top: "20.37%",
          left: "10.45%",
          right: "4.31%",
          transform: "rotate(2.35deg)",
          transformOrigin: "right center",
        }}
      >
        <p style={{ fontSize: "clamp(30px, 11.5vw, 45px)", fontWeight: 800, lineHeight: 1.08, color: "#3c2f22" }}>
          <em style={{ fontStyle: "italic" }}>Find</em>
          {" what you need."}
        </p>
      </div>

      {/* ── Animation bouton ── */}
      <style>{`
        .btn-start { background: #ffb92e; transition: background 2s ease; }
        .btn-start:active { background: #3c2f22; }
        .btn-circle { background: #3c2f22; position: absolute; left: 5px; top: 5px; transition: left 2s ease, background 2s ease; }
        .btn-start:active .btn-circle { left: calc(100% - 67px); background: #ffb92e; }
        .btn-arrow { stroke: white; transition: stroke 2s; }
        .btn-start:active .btn-arrow { stroke: #3c2f22; }
        .btn-label { color: #3c2f22; transition: color 2s; }
        .btn-start:active .btn-label { color: #ffb92e; }
        @media (max-width: 768px) {
          .btn-start { transition: background 0.3s ease; }
          .btn-circle { transition: left 0.3s ease, background 0.3s ease; }
          .btn-arrow { transition: stroke 0.3s; }
          .btn-label { transition: color 0.3s; }
        }
      `}</style>

      {/* ── Bouton "See how it works" ── */}
      <div
        className="absolute"
        style={{
          top: "33.3%",
          left: "14%",
          right: "14%",
          transform: "rotate(2.65deg)",
        }}
      >
        <Link href="/onboarding" className="block">
          <div className="btn-start" style={{ position: "relative", borderRadius: 85, height: 72 }}>
            <p
              className="btn-label"
              style={{
                position: "absolute", inset: 0, paddingLeft: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 500, letterSpacing: "-0.3px",
              }}
            >
              See how it works
            </p>
            <div
              className="btn-circle flex items-center justify-center"
              style={{ width: 62, height: 62, borderRadius: "50%", zIndex: 1 }}
            >
              <svg width="34" height="34" viewBox="0 0 28 28" fill="none">
                <path className="btn-arrow" d="M5 14H23M23 14L15 6M23 14L15 22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Décoration scribble bas ── */}
      <div
        className="absolute pointer-events-none"
        style={{ left: -18, top: 629, width: 281, height: 269 }}
      >
        <Image src="/deco-scribble.png" alt="" fill className="object-contain object-left-top" />
      </div>

      {/* ── Habits ── */}
      <Cloth src="/clothes-01.png" w={215} h={215} x={-20}  y={358} rotate={4}   />
      <Cloth src="/clothes-06.png" w={145} h={190} x={190}  y={388} rotate={-10} />
      <Cloth src="/clothes-03.png" w={195} h={210} x={-15}  y={510} rotate={15}  />
      <Cloth src="/clothes-07.png" w={118} h={155} x={232}  y={540} rotate={-8}  />
      <Cloth src="/clothes-05.png" w={130} h={120} x={330}  y={465} rotate={12}  />
      <Cloth src="/clothes-04.png" w={150} h={190} x={142}  y={535} rotate={5}   />
      <Cloth src="/clothes-08.png" w={245} h={328} x={305}  y={592} rotate={8}   />
      <Cloth src="/clothes-02.png" w={175} h={255} x={-10}  y={658} rotate={-8}  />
      <Cloth src="/clothes-09.png" w={155} h={190} x={155}  y={720} rotate={0}   />
    </div>
  );
}

function Cloth({ src, w, h, x, y, rotate }: { src: string; w: number; h: number; x: number; y: number; rotate: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: w, height: h, transform: rotate !== 0 ? `rotate(${rotate}deg)` : undefined }}
    >
      <Image src={src} alt="" fill sizes="250px" className="object-contain drop-shadow-lg" />
    </div>
  );
}
