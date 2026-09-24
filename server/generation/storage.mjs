import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { cloudReferenceReadClient } from "./local-cloud-reference.mjs";

export async function storeGeneratedAsset({
  bucket,
  bytes,
  checksum,
  contentType,
  key,
  storage,
}) {
  await storage.send(
    new PutObjectCommand({
      Body: bytes,
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
      Metadata: { sha256: checksum },
    }),
  );
}

export function discardGeneratedAsset({ bucket, key, storage }) {
  return storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function readPrivateObject({ bucket, key, maxBytes, storage }) {
  const response = await storage.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (
    Number.isFinite(maxBytes) &&
    Number(response.ContentLength ?? 0) > maxBytes
  ) {
    throw new Error("Private object exceeds the allowed size.");
  }
  if (!response.Body || typeof response.Body.transformToByteArray !== "function") {
    throw new Error("Private object body is unavailable.");
  }
  const data = await response.Body.transformToByteArray();
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (!bytes.length) throw new Error("Private object is empty.");
  if (Number.isFinite(maxBytes) && bytes.length > maxBytes) {
    throw new Error("Private object exceeds the allowed size.");
  }
  return {
    bytes,
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

export function signAssetRead({ bucket, key, publicStorage }) {
  const cloud = cloudReferenceReadClient(publicStorage, key);
  return getSignedUrl(
    cloud ?? publicStorage,
    new GetObjectCommand({ Bucket: cloud ? publicStorage.cloudReferenceBucketEndpoint : bucket, Key: key }),
    { expiresIn: 15 * 60 },
  );
}

export const CARD_PREVIEW_PROCESS = "image/resize,m_lfit,w_512,h_512/format,webp/quality,Q_80";

export function addCloudCardPreviewProcessing(client) {
  client.middlewareStack.add(
    (next) => async (args) => {
      args.request.query = {
        ...args.request.query,
        "x-oss-process": CARD_PREVIEW_PROCESS,
      };
      return next(args);
    },
    { step: "build", priority: "low", name: "ossCardPreview" },
  );
  return client;
}

export function signCloudCardPreview({ key, publicStorage }) {
  if (!cloudReferenceReadClient(publicStorage, key)) return null;
  return getSignedUrl(
    publicStorage.cloudReferencePreviewClient,
    new GetObjectCommand({
      Bucket: publicStorage.cloudReferenceBucketEndpoint,
      Key: key,
    }),
    { expiresIn: 15 * 60 },
  );
}

export async function readCardPreview({ bucket, key, storage }) {
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
