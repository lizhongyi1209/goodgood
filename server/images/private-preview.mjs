import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { cloudReferenceReadClient } from "../generation/local-cloud-reference.mjs";

// Named, fixed preset. New surfaces reuse it until a different size is justified.
export const CARD_PREVIEW_PROCESS = "image/resize,m_lfit,w_512,h_512/format,webp/quality,Q_80";

export function addCloudCardPreviewProcessing(client) {
  client.middlewareStack.add(
    (next) => async (args) => {
      args.request.query = { ...args.request.query, "x-oss-process": CARD_PREVIEW_PROCESS };
      return next(args);
    },
    { step: "build", priority: "low", name: "ossCardPreview" },
  );
  return client;
}

/**
 * Return a private card image after the caller has checked owner and visibility.
 * Cloud references use OSS processing; other private objects stream through Sharp.
 * The result is either a short-lived processed redirect or WebP bytes.
 * @returns {Promise<{redirectUrl: string} | {bytes: Buffer, mimeType: string}>}
 */
export async function readPrivateImagePreview({ bucket, key, storage, publicStorage }) {
  if (cloudReferenceReadClient(publicStorage, key)) {
    return {
      redirectUrl: await getSignedUrl(
        publicStorage.cloudReferencePreviewClient,
        new GetObjectCommand({ Bucket: publicStorage.cloudReferenceBucketEndpoint, Key: key }),
        { expiresIn: 15 * 60 },
      ),
    };
  }

  const object = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const maxBytes = 200 * 1024 * 1024;
  if (Number(object.ContentLength ?? 0) > maxBytes || !object.Body) {
    throw new Error("Private image is unavailable or too large for preview.");
  }
  let receivedBytes = 0;
  const limit = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      callback(receivedBytes > maxBytes ? new Error("Private image exceeds the preview limit.") : null, chunk);
    },
  });
  const transformer = sharp({ limitInputPixels: 268_435_456 })
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 });
  const output = transformer.toBuffer();
  const [, bytes] = await Promise.all([pipeline(object.Body, limit, transformer), output]);
  return { bytes, mimeType: "image/webp" };
}
