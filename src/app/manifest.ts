import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ТОКТОБО KG",
    short_name: "ТОКТОБО",
    description: "Оку. Өнүк. Токтобо.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2b03f",
    theme_color: "#f2b03f",
    lang: "ky",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
