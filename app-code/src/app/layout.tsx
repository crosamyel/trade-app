import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRADE.app",
  description: "Local clothing swap. Swap, don't shop.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TRADE.app",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#2A2A2A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background">
        {/* Bande brune fixe qui couvre la safe-area-inset-top (Dynamic Island / notch) en PWA */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            height: "env(safe-area-inset-top, 0px)",
            background: "#3c2f22",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
        {/*
          Cadre mobile-first : l'app vit dans une colonne étroite (max ~480px),
          centrée sur grand écran. Tous les écrans s'insèrent dans ce cadre.
        */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
          <PageTransition>{children}</PageTransition>
        </div>
        {/* Nav persistante : reste montée entre les pages → la boule peut s'animer */}
        <BottomNav />
      </body>
    </html>
  );
}
