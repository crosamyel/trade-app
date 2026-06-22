"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "trade_progress";

export function ProgressBar({ fill }: { fill: number }) {
  /* Toujours 0 au SSR pour correspondre au HTML serveur */
  const [width, setWidth] = useState(0);
  /* Transition désactivée au départ pour le saut instantané */
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const prev = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);

    /* 1. Sauter instantanément à la valeur précédente (pas de transition) */
    setWidth(prev);

    /* 2. Activer la transition, puis animer vers la valeur cible */
    const raf1 = requestAnimationFrame(() => {
      setAnimated(true);
      const raf2 = requestAnimationFrame(() => {
        setWidth(fill);
        localStorage.setItem(STORAGE_KEY, String(fill));
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => cancelAnimationFrame(raf1);
  }, [fill]);

  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        width: 305,
        height: 21,
        background: "#3c2f22",
        borderRadius: 28,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width,
          height: "100%",
          background: "#ffb92e",
          borderRadius: 28,
          transition: animated
            ? "width 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            : "none",
        }}
      />
    </div>
  );
}
