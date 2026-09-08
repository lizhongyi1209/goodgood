import { signAssetRead } from "./storage.mjs";
import { publicGenerationJob } from "./repository.mjs";

export async function presentGenerationJob(resources, row) {
  const [signedAssets, signedReferences] = await Promise.all([
    Promise.all(
      (row.assets ?? []).map(async (asset) => [
        asset.id,
        await signAssetRead({
          bucket: resources.config.objectStorage.bucket,
          key: asset.object_key,
          publicStorage: resources.publicStorage,
        }),
      ]),
    ),
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
  return publicGenerationJob(
    row,
    new Map(signedAssets),
    new Map(signedReferences),
  );
}
