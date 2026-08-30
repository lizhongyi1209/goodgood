import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export function signAssetRead({ bucket, key, publicStorage }) {
  return getSignedUrl(
    publicStorage,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 15 * 60 },
  );
}
