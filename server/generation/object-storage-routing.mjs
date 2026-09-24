import { createHmac } from "node:crypto";

const OSS_KEY_PREFIX = "oss/";
const READ_TTL_SECONDS = 15 * 60;

export function isOssObjectKey(key) {
  return typeof key === "string" && key.startsWith(OSS_KEY_PREFIX);
}

export function newObjectKey(relativeKey, objectStorage) {
  return objectStorage.providerKind === "oss" && !objectStorage.emergencyR2Writes
    ? `${OSS_KEY_PREFIX}${relativeKey}`
    : relativeKey;
}

export function signOssAssetRead({ key, origin, secret, now = Date.now() }) {
  if (!isOssObjectKey(key)) {
    throw new Error("Only OSS object keys may use ESA asset read URLs.");
  }
  const path = `/${key.split("/").map(encodeURIComponent).join("/")}`;
  const url = new URL(path, `${origin}/`);
  const expires = Math.floor(now / 1_000) + READ_TTL_SECONDS;
  const signature = createHmac("sha256", secret)
    .update(`${url.pathname}\n${expires}`)
    .digest("hex");
  url.searchParams.set("gg_exp", String(expires));
  url.searchParams.set("gg_sig", signature);
  return url.toString();
}
