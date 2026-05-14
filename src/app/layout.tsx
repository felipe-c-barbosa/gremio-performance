import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grêmio no Brasileirão | Comparativo 2020–2026",
  description:
    "Dashboard comparando a campanha do Grêmio no Brasileirão 2026 com 2020, 2021, 2023, 2024 e 2025.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#09090b] font-sans text-zinc-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
