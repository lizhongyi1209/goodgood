import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
