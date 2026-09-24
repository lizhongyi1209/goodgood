import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isOssObjectKey, signOssAssetRead } from "./object-storage-routing.mjs";

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
  const bytes = Buffer.from(await response.Body.transformToByteArray());
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
  const route = publicStorage.readRoute;
  if (route && isOssObjectKey(key)) {
    return signOssAssetRead({ key, origin: route.origin, secret: route.secret });
  }
  return getSignedUrl(
    route?.legacyClient ?? publicStorage,
    new GetObjectCommand({ Bucket: route?.legacyBucket ?? bucket, Key: key }),
    { expiresIn: 15 * 60 },
  );
}
