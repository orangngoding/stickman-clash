import type { Metadata, Viewport } from "next";
import { Russo_One } from "next/font/google";
import "./globals.css";

const russo = Russo_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-russo",
});

export const metadata: Metadata = {
  title: "Stickman Clash",
  description: "Game fighting 2D bergaya stickman berbasis web.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={russo.variable}>
      <body className="bg-[#0b1020] text-slate-200 antialiased">{children}</body>
    </html>
  );
}
