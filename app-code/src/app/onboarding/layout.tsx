"use client";

import { usePathname } from "next/navigation";
import { ProgressBar } from "@/components/ProgressBar";

const PROGRESS: Record<string, number> = {
  "/onboarding": 73,
  "/onboarding/clothes": 151,
  "/onboarding/style": 245,
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ position: "relative", width: "100%", flex: 1 }}>
      {/* Barre de progression — hors du dissolve, anime entre les pages */}
      <ProgressBar fill={PROGRESS[pathname] ?? 73} />
      {children}
    </div>
  );
}
