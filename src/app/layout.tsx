import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

import ConnectionStatus from "@/components/ConnectionStatus";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Live Workshop Progress & Assessment Tracker",
  description: "Track student attendance, practical activities, and assessments. Automate certificates with AI feedback integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-slate-800 bg-[#f4f6fc]">
        {children}
        <ConnectionStatus />
      </body>
    </html>
  );
}
