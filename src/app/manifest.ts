import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quest Day — Your Daily Adventure",
    short_name: "Quest Day",
    description: "Complete quests, collect rewards, and keep your streak alive.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f1",
    theme_color: "#f8f7f1",
    lang: "en",
    icons: [{ src: "/elf-ranger.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
  };
}
