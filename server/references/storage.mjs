import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { REFERENCE_LIMITS } from "./constants.mjs";
import { ReferenceRequestError } from "./errors.mjs";

export function signReferenceUpload({
  bucket,
  contentType,
  key,
  publicStorage,
}) {
  return getSignedUrl(
    publicStorage,
    new PutObjectCommand({ Bucket: bucket, ContentType: contentType, Key: key }),
    { expiresIn: REFERENCE_LIMITS.uploadTtlSeconds },
  );
}

export async function readReferenceObject({ bucket, key, storage }) {
  let object;
  try {
    object = await storage.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === "NoSuchKey" ||
      error?.name === "NotFound"
    ) {
      throw new ReferenceRequestError(
        "UPLOAD_NOT_FOUND",
        "尚未收到参考图文件，请重新上传。",
        409,
        true,
      );
    }
    throw error;
  }
  if ((object.ContentLength ?? 0) > REFERENCE_LIMITS.maxBytes) {
    throw new ReferenceRequestError(
      "UPLOAD_TOO_LARGE",
      "单张参考图不能超过 20 MB。",
    );
  }
  if (!object.Body?.transformToByteArray) {
    throw new Error("Object storage returned an unreadable body.");
  }
  const bytes = Buffer.from(await object.Body.transformToByteArray());
  return {
    bytes,
    contentType: object.ContentType ?? "",
  };
}

export function deleteReferenceObject({ bucket, key, storage }) {
  return storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
