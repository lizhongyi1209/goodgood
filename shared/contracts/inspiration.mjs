const MODEL_IDS = ['nano-banana-2','nano-banana-pro','gpt-image-2','gpt-image-2.5-sunburst','gpt-image-2.5-flare'];

export function inspirationParameters(row) {
  return {
    modelId: row.model_id,
    catalogModelId: row.catalog_model_id ?? row.model_id,
    catalogModelName: row.catalog_model_name ?? row.model_id,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    count: row.requested_count,
    referenceCount: (row.reference_snapshot ?? []).length,
    imageLine: row.image_line ?? 'special',
    thinkingLevel: row.thinking_level ?? 'high',
    googleSearch: Boolean(row.google_search),
    quality: row.quality ?? 'auto',
    background: row.background ?? 'auto',
    outputFormat: row.output_format ?? 'png',
  };
}

/** A reusable recipe contains no original references, prices or project linkage. */
export function inspirationRecipe(value) {
  const p=value?.parameters;
  if (!p || !MODEL_IDS.includes(p.modelId) || typeof value.prompt !== 'string' || !value.prompt.trim()
    || !['1K','2K','4K'].includes(p.resolution)
    || !['1:8','1:4','9:16','2:3','3:4','4:5','1:1','5:4','4:3','3:2','16:9','21:9','4:1','8:1'].includes(p.aspectRatio)
    || !['special','quality','dedicated'].includes(p.imageLine)
    || !['auto','low','medium','high','xhigh','max'].includes(p.quality)
    || !['auto','transparent'].includes(p.background) || !['png','jpeg','webp'].includes(p.outputFormat)) return null;
  return {
    prompt:value.prompt, references:[], count:1,
    modelId:p.modelId,catalogModelId:p.catalogModelId,
    aspectRatio:p.aspectRatio,resolution:p.resolution,imageLine:p.imageLine,
    thinkingLevel:p.thinkingLevel==='low'?'low':'high',googleSearch:Boolean(p.googleSearch),
    quality:p.quality,background:p.background,outputFormat:p.outputFormat,
  };
}
