import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoodGood · AI 视觉创作",
  description: "GoodGood 在线 AI 视觉创作工作台",
  icons: {
    icon: "/goodgood-mark.svg",
    shortcut: "/goodgood-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
