import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { SafeAreaBar } from "@/components/SafeAreaBar";
import { PushSetup } from "@/components/PushSetup";

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
        {/* Safe-area top bar — cream on landing/onboarding/auth, brown elsewhere */}
        <SafeAreaBar />
        {/*
          Cadre mobile-first : l'app vit dans une colonne étroite (max ~480px),
          centrée sur grand écran. Tous les écrans s'insèrent dans ce cadre.
        */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
          <PageTransition>{children}</PageTransition>
        </div>
        {/* Nav persistante : reste montée entre les pages → la boule peut s'animer */}
        <BottomNav />
        {/* Push notifications setup (invisible — demande permission après 3s) */}
        <PushSetup />
      </body>
    </html>
  );
}
