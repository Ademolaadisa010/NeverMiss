// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "NeverMiss — AI Smart Reminder Assistant",
  description:
    "Never forget important tasks. NeverMiss combines AI, voice interaction, and smart notifications to keep you on track.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0a0a1a] text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}