import type { Metadata } from "next";

import { AppNav } from "../components/layout/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Meal Planner",
  description: "Household weekly meal planner",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
