import type { GenerationModelId } from "@/shared/contracts/generation";

export type GenerationModelIcon = "nano" | "openai" | "bytedance";

export type GenerationModelPresentation = Readonly<{
  id: GenerationModelId;
  name: string;
  description: string;
  icon: GenerationModelIcon;
  recommended: boolean;
}>;

export const DEFAULT_GENERATION_MODEL_ID: GenerationModelId = "nano-banana-2.1";

export const GENERATION_MODEL_CATALOG = [
  {
    id: "nano-banana-2.1",
    name: "Nano Banana 2.1",
    description: "",
    icon: "nano",
    recommended: true,
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    description: "快速，批量",
    icon: "nano",
    recommended: false,
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "高质量资产，视觉优先",
    icon: "nano",
    recommended: false,
  },
  {
    id: "gpt-image-2.5-sunburst",
    name: "GPT IMAGE 2.5 sunburst",
    description: "高真实感，提示词遵循",
    icon: "openai",
    recommended: false,
  },
  {
    id: "gpt-image-2",
    name: "GPT IMAGE 2",
    description: "高真实感，提示词遵循",
    icon: "openai",
    recommended: false,
  },
  {
    id: "gpt-image-2.5-flare",
    name: "GPT IMAGE 2.5 flare",
    description: "高真实感，提示词遵循",
    icon: "openai",
    recommended: false,
  },
  {
    id: "seedream-5.0-pro",
    name: "Seedream 5.0 Pro",
    description: "图像生成，参考图融合",
    icon: "bytedance",
    recommended: false,
  },
] as const satisfies readonly GenerationModelPresentation[];

export function getGenerationModel(
  modelId: GenerationModelId,
): GenerationModelPresentation {
  const model = GENERATION_MODEL_CATALOG.find((item) => item.id === modelId);
  if (!model) throw new Error(`Unknown GoodGood model: ${modelId}`);
  return model;
}

export function findGenerationModelByName(
  name: string,
): GenerationModelPresentation | undefined {
  return GENERATION_MODEL_CATALOG.find((item) => item.name === name);
}
