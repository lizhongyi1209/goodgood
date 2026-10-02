import { formatGenerationResolution, getGenerationRatio, getGptImageQualityOptions,
  GPT_IMAGE_BACKGROUND_OPTIONS, GPT_IMAGE_OUTPUT_FORMAT_OPTIONS } from "@/features/creation/generation-options";
import { getGenerationModel } from "@/features/models/catalog";
import { imageLineName, isValidImageLine } from "@/shared/contracts/banana-lines.mjs";
import { isGptImageModelId, type GenerationInputSnapshot } from "@/shared/contracts/generation";
import styles from "./image-viewer.module.css";

export type ImageViewerMetadata = Readonly<{
  model: string;
  prompt: string;
  parameters: readonly Readonly<{ label: string; value: string }>[];
}>;

export function describeViewerGeneration(input: GenerationInputSnapshot, dimensions: Readonly<{ width?: number; height?: number }>): ImageViewerMetadata {
  const parameters = [
    { label: "画面比例", value: getGenerationRatio(input.aspectRatio).label },
    { label: "分辨率", value: formatGenerationResolution(input.resolution, dimensions) },
    { label: "数量", value: `${input.count} 张` },
  ];
  if (input.references.length) parameters.push({ label: "参考图", value: `${input.references.length} 张` });
  if (input.imageLine && isValidImageLine(input.modelId, input.imageLine)) {
    parameters.push({ label: "线路", value: imageLineName(input.imageLine) });
  }
  // Repository defaults span all models; only show options used in this model's provider request.
  if (input.modelId === "nano-banana-2") {
    if (input.thinkingLevel === "high") parameters.push({ label: "思考", value: "高" });
    if (input.googleSearch === true) parameters.push({ label: "谷歌搜索", value: "开启" });
  }
  if (isGptImageModelId(input.modelId)) {
    const quality = getGptImageQualityOptions(input.modelId).find((option) => option.value === input.quality);
    const background = GPT_IMAGE_BACKGROUND_OPTIONS.find((option) => option.value === input.background);
    const outputFormat = GPT_IMAGE_OUTPUT_FORMAT_OPTIONS.find((option) => option.value === input.outputFormat);
    if (quality) parameters.push({ label: "质量", value: quality.label });
    if (background) parameters.push({ label: "背景", value: background.label });
    if (outputFormat) parameters.push({ label: "输出格式", value: outputFormat.label });
  }
  return { model: input.catalogModelName || getGenerationModel(input.modelId).name, prompt: input.prompt, parameters };
}

export function ImageViewerDetails({ item }: Readonly<{ item: Readonly<{
  name: string; media?: "image" | "video"; width?: number; height?: number; metadata?: ImageViewerMetadata;
}> | null }>) {
  return <aside className={styles.details} aria-label="素材信息">
    <h2>{item?.name ?? "素材预览"}</h2>
    {item?.metadata ? <>
      <h3>生成参数</h3>
      <dl><div><dt>模型</dt><dd>{item.metadata.model}</dd></div>
        {item.metadata.parameters.map((parameter) => <div key={parameter.label}><dt>{parameter.label}</dt><dd>{parameter.value}</dd></div>)}
      </dl>
      {item.metadata.prompt && <><h3>提示词</h3><p className={styles.detailPrompt}>{item.metadata.prompt}</p></>}
    </> : item ? (item.width && item.height ? <dl><div><dt>尺寸</dt><dd>{item.width} × {item.height}</dd></div></dl> : null)
      : <p className={styles.detailEmpty}>请选择右侧素材。</p>}
  </aside>;
}
