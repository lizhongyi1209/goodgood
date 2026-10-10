import type { MediaTileItem, TemplateCardItem } from "@/features/design-system";

// GG-423 development presentation only. Replace with real template/discovery
// interfaces in a separately approved task. Never persist or auto-generate.
export const HOME_TEMPLATES: readonly (TemplateCardItem & { prompt: string })[] = [
  { id: "editorial", name: "服装大片", kind: "quick", cover: "/home-demo/fashion.jpg", prompt: "自然光下的服装大片，简洁背景，真实织物纹理。" },
  { id: "product", name: "产品摄影", kind: "quick", cover: "/home-demo/still-life.jpg", prompt: "简洁的产品静物摄影，柔和侧光，细腻材质。" },
  { id: "architecture", name: "空间设计", kind: "workflow", cover: "/home-demo/architecture.jpg", prompt: "明亮的建筑空间，干净线条，自然光影。" },
  { id: "landscape", name: "旅行影像", kind: "quick", cover: "/home-demo/landscape.jpg", prompt: "远山与湖泊的旅行摄影，宁静自然，保留真实光影。" },
];
export const HOME_CATEGORIES = ["全部", "服装", "摄影", "广告", "建筑", "自然"] as const;
export const HOME_DISCOVERY: readonly (MediaTileItem & { category: string; prompt: string })[] = [
  { id: "look", title: "城市穿搭", src: "/home-demo/fashion.jpg", width: 800, height: 533, category: "服装", prompt: "城市街头服装摄影，自然姿态，柔和日光。" },
  { id: "leaves", title: "光与叶", src: "/home-demo/leaves.jpg", width: 800, height: 601, category: "自然", prompt: "自然光穿过绿色叶片，细腻植物纹理。" },
  { id: "space", title: "建筑的留白", src: "/home-demo/architecture.jpg", width: 800, height: 533, category: "建筑", prompt: "极简建筑空间，柔和光影与清晰线条。" },
  { id: "objects", title: "日常静物", src: "/home-demo/still-life.jpg", width: 800, height: 533, category: "广告", prompt: "桌面静物摄影，柔和自然光，细腻材质。" },
  { id: "water", title: "山湖之间", src: "/home-demo/landscape.jpg", width: 800, height: 533, category: "摄影", prompt: "平静的湖泊与远山，柔和晨光。" },
  { id: "flowers", title: "花的形状", src: "/home-demo/flowers.jpg", width: 800, height: 534, category: "自然", prompt: "盛开的花朵，明亮自然光，真实色彩。" },
  { id: "coffee", title: "一杯咖啡", src: "/home-demo/coffee.jpg", width: 800, height: 533, category: "广告", prompt: "咖啡静物摄影，简洁构图，细腻光影。" },
  { id: "street", title: "城市片刻", src: "/home-demo/street.jpg", width: 800, height: 533, category: "摄影", prompt: "城市建筑摄影，捕捉光线与日常瞬间。" },
];
