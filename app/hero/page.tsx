import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Hero10, type Hero10Props } from "@/components/ui/hero-10";

export const metadata: Metadata = {
  title: "GoodGood — 让创作持续发生",
  description: "GoodGood 视觉创作工作台的 Hero 页面预览。",
  robots: { index: false, follow: false },
};

const hero = {
  title: "让想法成为视觉作品",
  titleLine2Prefix: "让每一次创作",
  titleHighlight: "都能继续",
  description: "在 GoodGood 生成、查看并整理视觉素材，将创作过程保存为随时可以继续的项目。",
  images: [
    "https://cdn.21st.dev/assets/mirror/2f/2f52f0ddd94c14a93f42a61ff2bb8842b52b78e27051e7e0f6fb579d50a5524f.jpg",
    "https://cdn.21st.dev/assets/mirror/94/94fe535ff9ce491f4943129b6ff6b4e5c9465bb578892a2447ecdbbca1907d37.jpg",
    "https://cdn.21st.dev/assets/mirror/ce/ce27c3636cc87ff0803227125972049f68bd4e2c0c5219fa2540549464abc51c.jpg",
  ],
  imageAlts: ["示例视觉作品一", "示例视觉作品二", "示例视觉作品三"],
  animation: "subtle",
  primaryCTA: { ctaEnabled: true, text: "开始创作", link: "/create", variant: "default", size: "lg" },
  secondaryCTA: { ctaEnabled: true, text: "查看资产", link: "/assets", variant: "outline", size: "lg" },
} satisfies Hero10Props;

export default function HeroPage() {
  return <main className="min-h-screen bg-background">
    <header className="mx-auto flex max-w-6xl items-center px-6 pt-7">
      <Link href="/create" aria-label="GoodGood，前往创作工作台">
        <Image src="/goodgood-wordmark.svg" alt="GoodGood" width={100} height={23} priority />
      </Link>
    </header>
    <Hero10 {...hero} />
  </main>;
}
