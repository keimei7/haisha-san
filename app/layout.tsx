import type { Metadata } from "next";
import "./globals.css";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";
export const metadata: Metadata = {
  title: "配車さん",
  description: "車両運行管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}