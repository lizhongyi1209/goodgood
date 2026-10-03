import { createHash } from "node:crypto";
import { sessionExpiredError } from "../auth/errors.mjs";
import { getGenerationResources, prepareObjectStorage } from "../generation/resources.mjs";
import { readPrivateObject } from "../generation/storage.mjs";
import { newLocalCloudReferenceKey } from "../generation/local-cloud-reference.mjs";
import { storeReferenceObject, deleteReferenceObject } from "../references/storage.mjs";
import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "../../shared/contracts/upload-limits.mjs";
import { commitImageCleanup } from "./repository.mjs";
import { cleanImageMetadata } from "./image.mjs";
import { validateImageCleanupInput } from "./validation.mjs";
import { ImageCleanupError } from "./errors.mjs";

export async function removeImageAiMetadata({ ownerContext, workspaceId = null, input }, {
  getResources = getGenerationResources, commit = commitImageCleanup, clean = cleanImageMetadata,
  readObject = readPrivateObject, prepareStorage = prepareObjectStorage,
} = {}) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  const normalized = validateImageCleanupInput(input);
  const resources = await getResources();
  return commit(resources.pool, { ownerId: ownerContext.ownerId, workspaceId, input: normalized,
    prepareCopy: async ({ source, workspace, referenceId }) => {
      const bucket = resources.config.objectStorage.bucket;
      let object;
      try { object = await readObject({ bucket, key: source.object_key, maxBytes: PRIVATE_IMAGE_UPLOAD_MAX_BYTES, storage: resources.storage }); }
      catch (error) {
        if (error.message === "Private object exceeds the allowed size.") throw new ImageCleanupError("IMAGE_CLEANUP_SIZE_INVALID", "请选择不超过20 MB的JPEG或PNG原图。", 413);
        throw error;
      }
      const image = await clean(object.bytes, normalized.name);
      const checksum = createHash("sha256").update(image.bytes).digest("hex");
      const objectKey = newLocalCloudReferenceKey(`references/${workspace.id}/${ownerContext.ownerId}/${referenceId}/original`, resources.config.cloudReference);
      await prepareStorage(resources);
      return { objectKey, file: { ...image, checksum },
        storeObject: () => storeReferenceObject({ bucket, key: objectKey, bytes: image.bytes, checksum, contentType: image.mimeType, storage: resources.storage }),
        deleteObject: () => deleteReferenceObject({ bucket, key: objectKey, storage: resources.storage }),
      };
    },
  });
}
