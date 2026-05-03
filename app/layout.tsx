import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { BottomTabBar } from "@/components/nav/bottom-tab-bar";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-family-sans",
  display: "swap",
});

/** Root layout supplying html/body, fonts, global styles import, and shell navigation. */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="mx-auto min-h-screen max-w-[430px] bg-bg pb-20 font-sans text-text-primary">
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
