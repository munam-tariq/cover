import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://supportbase.app"),
  title: {
    default: "SupportBase - AI Chatbot for Vibe Coders",
    template: "%s | SupportBase",
  },
  description: "Add an AI chatbot to your app in one line. Works with Cursor, Claude, and your favorite AI tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
