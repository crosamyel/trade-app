"use client";

import { usePathname } from "next/navigation";

/* Pages where the safe-area top bar should be cream (not brown) */
const CREAM_STARTS = ["/onboarding", "/install", "/login", "/signup"];

export function SafeAreaBar() {
  const pathname = usePathname() ?? "";
  const isCream =
    pathname === "/" || CREAM_STARTS.some((p) => pathname.startsWith(p));

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "env(safe-area-inset-top, 0px)",
        background: isCream ? "#f9f4e8" : "#3c2f22",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}
