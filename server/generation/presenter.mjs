import { signAssetRead } from "./storage.mjs";
import { publicGenerationJob } from "./repository.mjs";

export async function presentGenerationJob(resources, row) {
  const [previewUrl, signedReferences] = await Promise.all([
    row.object_key
      ? signAssetRead({
          bucket: resources.config.objectStorage.bucket,
          key: row.object_key,
          publicStorage: resources.publicStorage,
        })
      : null,
    Promise.all(
      (row.reference_snapshot ?? []).map(async (reference) => [
        reference.id,
        await signAssetRead({
          bucket: resources.config.objectStorage.bucket,
          key: reference.objectKey,
          publicStorage: resources.publicStorage,
        }),
      ]),
    ),
  ]);
  return publicGenerationJob(row, previewUrl, new Map(signedReferences));
}
