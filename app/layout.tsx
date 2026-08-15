import type { Metadata } from "next";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const slug = await getActiveProfileSlug();
  const theme = getThemeColors(slug);
  const themeStyle = { "--theme-own": theme.own, "--theme-accent": theme.accent } as CSSProperties;
  const mirrored = slug === "FRIEND";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body className="min-h-full flex flex-col">
        <LoginGate />
        <Nav />
        <main className="max-w-3xl mx-auto w-full px-4 py-6 pb-28 flex-1">{children}</main>
        <BottomNav mirrored={mirrored} />
      </body>
    </html>
  );
}
