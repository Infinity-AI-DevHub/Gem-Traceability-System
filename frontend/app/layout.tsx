import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Origin Gemstone Ledger",
  description: "Gemstone lifecycle and chain of custody management.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
