"use client";

import { usePathname } from "next/navigation";

/* Fondu doux du contenu à chaque changement de page.
   Clé = pathname → le contenu se remonte et rejoue l'animation.
   On anime uniquement l'opacité (ne casse pas les éléments position:fixed). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade" style={{ width: "100%" }}>
      {children}
    </div>
  );
}
