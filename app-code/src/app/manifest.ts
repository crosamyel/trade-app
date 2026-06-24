import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TRADE.app",
    short_name: "TRADE.app",
    description: "Local clothing swap. Swap, don't shop.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F9F4E8",
    theme_color: "#2A2A2A",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
