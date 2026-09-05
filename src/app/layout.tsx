import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spatial Forge",
  description: "Generate 3D models from text with the Mint API.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
