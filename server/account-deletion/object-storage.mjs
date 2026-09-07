import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export function deletePrivateObject({ bucket, key, storage }) {
  return storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
