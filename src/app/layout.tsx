import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quest Day — Your Daily Adventure",
  description: "A cozy fantasy daily planner. Complete quests, collect rewards, and keep your streak alive.",
  applicationName: "Quest Day",
  icons: { icon: "/elf-ranger.svg", apple: "/elf-ranger.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f8f7f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
