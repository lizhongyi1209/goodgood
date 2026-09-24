import { publicGenerationJob } from "./repository.mjs";
import { privateImageUrls } from "../../shared/private-image-urls.mjs";

export async function presentGenerationJob(
  _resources,
  row,
  { includeReferenceUrls = true } = {},
) {
  const assetUrls = (row.assets ?? []).map((asset) => [
    asset.id,
    privateImageUrls("asset", asset.id).contentUrl,
  ]);
  const referenceUrls = includeReferenceUrls
    ? (row.reference_snapshot ?? []).map((reference) => [
        reference.id,
        privateImageUrls("reference", reference.id).contentUrl,
      ])
    : [];
  return publicGenerationJob(
    row,
    new Map(assetUrls),
    new Map(referenceUrls),
  );
}
