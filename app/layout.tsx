import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Meal Planner",
  description: "Household weekly meal planner",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
