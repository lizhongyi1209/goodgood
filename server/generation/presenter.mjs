import { publicGenerationJob } from "./repository.mjs";

export async function presentGenerationJob(
  _resources,
  row,
  { includeReferenceUrls = true } = {},
) {
  const assetUrls = (row.assets ?? []).map((asset) => [
    asset.id,
    `/api/assets/${encodeURIComponent(asset.id)}/content`,
  ]);
  const referenceUrls = includeReferenceUrls
    ? (row.reference_snapshot ?? []).map((reference) => [
        reference.id,
        `/api/references/${encodeURIComponent(reference.id)}/content`,
      ])
    : [];
  return publicGenerationJob(
    row,
    new Map(assetUrls),
    new Map(referenceUrls),
  );
}
