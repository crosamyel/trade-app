import Image from "next/image";
import Link from "next/link";

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function OnboardingExplanation() {
  return (
    <div
      className="page-enter relative bg-[#f9f4e8]"
      style={{ width: "100%", height: "max(100dvh, 850px)", overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: FONT }}
    >

      {/* Titre 64px — "How does it work?" */}
      <div className="absolute" style={{ top: "calc(106px + env(safe-area-inset-top, 0px))", left: 24, right: 24 }}>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.06,
            color: "#3c2f22",
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          How does<br />it work
        </h1>
      </div>

      {/* Point d'interrogation décoratif (Character_022) — à droite de "work" */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "calc(172px + env(safe-area-inset-top, 0px))",
          right: 38,
          width: 72,
          height: 88,
          transform: "rotate(14.29deg)",
          transformOrigin: "center center",
        }}
      >
        <Image src="/onb-question.png" alt="" fill className="object-contain" />
      </div>

      {/* Bulle de dialogue */}
      <div
        className="absolute pointer-events-none"
        style={{ left: 12, top: "calc(360px + env(safe-area-inset-top, 0px))", width: 378, height: 288 }}
      >
        <Image
          src="/onb-speech-bubble.png"
          alt=""
          fill
          className="object-contain object-left-top"
        />
      </div>

      {/* Texte dans la bulle */}
      <div className="absolute" style={{ top: "calc(383px + env(safe-area-inset-top, 0px))", left: 40, right: 48 }}>
        <p
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#3c2f22",
            lineHeight: 1.5,
          }}
        >
          Discover clothes near you by swiping through items. If you&apos;re interested, start a trade and exchange your clothing with others nearby.
        </p>
      </div>

      {/* Emoji visage amoureux */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 137,
          top: "calc(530px + env(safe-area-inset-top, 0px))",
          width: 80,
          height: 76,
          transform: "rotate(15deg)",
        }}
      >
        <Image src="/onb-emoji-hearts.png" alt="" fill className="object-contain" />
      </div>

      {/* Emoji lunettes de soleil */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 27,
          top: "calc(613px + env(safe-area-inset-top, 0px))",
          width: 80,
          height: 76,
          transform: "rotate(-5.53deg)",
        }}
      >
        <Image src="/onb-emoji-sunglasses.png" alt="" fill className="object-contain" />
      </div>

      {/* Bouton "Let's go" */}
      <div
        className="absolute"
        style={{
          bottom: "calc(48px + env(safe-area-inset-bottom, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: 226,
        }}
      >
        <Link href="/onboarding/clothes" className="block">
          <div
            style={{
              background: "#3c2f22",
              borderRadius: 85,
              height: 61,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#ffb92e",
                letterSpacing: "-0.3px",
              }}
            >
              Let&apos;s go
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
