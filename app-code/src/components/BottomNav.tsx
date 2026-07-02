"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export type NavId = "home" | "msg" | "plus" | "search" | "profile";

/* Ordre des 5 slots de gauche à droite */
const SLOTS: NavId[] = ["home", "msg", "plus", "search", "profile"];

const ROUTES: Record<NavId, string> = {
  home: "/home",
  msg: "/matches",
  plus: "/upload",
  search: "/search",
  profile: "/profile",
};

/* La nav n'apparaît QUE sur ces pages */
const SHOW_ON = ["/home", "/search", "/matches", "/profile", "/upload"];
const HIDE_ON = ["/profile/edit", "/upload/multi"];

function activeFromPath(path: string): NavId | null {
  if (path.startsWith("/upload")) return "plus";
  if (path.startsWith("/matches")) return "msg";
  if (path === "/profile") return "profile";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/home")) return "home";
  return null;
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "/home";
  const active = activeFromPath(pathname);

  const [lastActive, setLastActive] = useState<NavId>("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { if (active) setLastActive(active); }, [active]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 50); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Allowlist : n'affiche la nav que sur les pages autorisées */
  const visible = SHOW_ON.some((p) => pathname.startsWith(p)) && !HIDE_ON.some((p) => pathname.startsWith(p));
  if (!visible) return null;

  const shown: NavId = active ?? lastActive;
  const activeIndex = SLOTS.indexOf(shown);

  return (
    <nav style={{
      position: "fixed",
      bottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
      left: "50%",
      transform: scrolled ? "translateX(-50%) scale(0.92)" : "translateX(-50%)",
      transition: "transform 0.3s ease",
      width: "calc(100% - 48px)",
      maxWidth: 380,
      height: 64,
      zIndex: 50,
    }}>
      {/* Barre principale (pilule brune) */}
      <div style={{
        position: "absolute", inset: 0, background: "#3c2f22",
        borderRadius: 50, boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }} />

      {/* Boule jaune flottante */}
      <div style={{
        position: "absolute", bottom: 28,
        left: `calc(16px + (100% - 32px) * ${(activeIndex + 0.5) / 5})`,
        transform: "translateX(-50%)",
        width: 52, height: 52,
        background: "#FFC543", borderRadius: "50%",
        boxShadow: "0 0 20px rgba(255,197,67,0.6)",
        zIndex: 2, pointerEvents: "none",
        transition: "left 0.42s cubic-bezier(0.4, 0, 0.2, 1)",
      }} />

      {/* Couche icônes */}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
        {SLOTS.map((id, i) => {
          const isActive = id === shown;
          return (
            <div
              key={id}
              style={{
                position: "absolute",
                left: `calc(16px + (100% - 32px) * ${(i + 0.5) / 5})`,
                bottom: isActive ? 42 : 20,
                transform: "translateX(-50%)",
                color: isActive ? "#2D1A0A" : "#8B6914",
                transition: "bottom 0.42s cubic-bezier(0.4, 0, 0.2, 1), color 0.42s ease",
              }}
            >
              <NavIcon id={id} active={isActive} />
            </div>
          );
        })}
      </div>

      {/* Couche boutons cliquables */}
      <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", alignItems: "center", padding: "0 16px" }}>
        {SLOTS.map((id) => (
          <button
            key={id}
            onClick={() => router.push(ROUTES[id])}
            style={{ flex: 1, height: 64, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            aria-label={id}
          />
        ))}
      </div>
    </nav>
  );
}

function NavIcon({ id, active }: { id: NavId; active: boolean }) {
  switch (id) {
    case "home":
      return active
        ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M10 21V14H14V21H19A1 1 0 0020 20V11L12 3.5L4 11V20A1 1 0 005 21H10Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3L21 11V20A1 1 0 0120 21H15V15H9V21H4A1 1 0 013 20V11Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "msg":
      return active
        ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 5 1-5H4a2 2 0 01-2-2V5a2 2 0 012-2z" fill="currentColor" /></svg>
        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 3h16a2 2 0 012 2v10a2 2 0 01-2 2H9l-5 5 1-5H4a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>;
    case "plus":
      return <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
    case "search":
      return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" /><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
    case "profile":
      return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2.2" /><path d="M4 20C4 17.24 7.58 15 12 15C16.42 15 20 17.24 20 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
  }
}
