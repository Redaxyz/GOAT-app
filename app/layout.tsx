import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/app/components/Nav";
import BottomNav from "@/app/components/BottomNav";
import LoginGate from "@/app/components/LoginGate";
import { getActiveProfileSlug } from "@/lib/session";
import { getThemeColors } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GOAT",
  description: "Nutrition, diet, and fitness tracker",
};

// viewport-fit=cover makes env(safe-area-inset-*) resolve to real values
// (notch/home-indicator devices), used by the fixed bottom nav below.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const slug = await getActiveProfileSlug();
  const theme = getThemeColors(slug);
  const themeStyle = { "--theme-own": theme.own, "--theme-accent": theme.accent } as CSSProperties;
  const mirrored = slug === "FRIEND";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      style={themeStyle}
    >
      {/* min-h-dvh (not h-full/min-h-full) tracks the real, on-screen viewport
          as it shrinks for the mobile keyboard or browser chrome — the static
          100% height was fighting the fixed bottom nav, causing it to overlap
          content and the page to jump when an input got focused. */}
      <body className="min-h-dvh flex flex-col">
        <LoginGate />
        <Nav />
        <main className="max-w-3xl mx-auto w-full px-4 py-6 pb-32 flex-1">{children}</main>
        <BottomNav mirrored={mirrored} />
      </body>
    </html>
  );
}
