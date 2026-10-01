import { formatGenerationResolution, getGenerationRatio, gptImageBackgroundLabel, gptImageOutputFormatLabel,
  gptImageQualityLabel } from "@/features/creation/generation-options";
import { getGenerationModel } from "@/features/models/catalog";
import { imageLineName } from "@/shared/contracts/banana-lines.mjs";
import type { GenerationInputSnapshot } from "@/shared/contracts/generation";
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
    { label: "参考图", value: input.references.length ? `${input.references.length} 张` : "无" },
  ];
  if (input.imageLine) parameters.push({ label: "线路", value: imageLineName(input.imageLine) });
  if (input.thinkingLevel) parameters.push({ label: "思考", value: input.thinkingLevel === "high" ? "高" : "低" });
  if (input.googleSearch !== undefined) parameters.push({ label: "谷歌搜索", value: input.googleSearch ? "开启" : "关闭" });
  if (input.quality) parameters.push({ label: "质量", value: gptImageQualityLabel(input.quality) });
  if (input.background) parameters.push({ label: "背景", value: gptImageBackgroundLabel(input.background) });
  if (input.outputFormat) parameters.push({ label: "输出格式", value: gptImageOutputFormatLabel(input.outputFormat) });
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
    </> : item ? <>
      <p>{item.media === "video" ? "视频素材" : "图片素材"}</p>
      {item.width && item.height ? <dl><div><dt>尺寸</dt><dd>{item.width} × {item.height}</dd></div></dl> : null}
      <p className={styles.detailEmpty}>未提供生成模型与参数。</p>
    </> : <p className={styles.detailEmpty}>请选择右侧素材。</p>}
  </aside>;
}
