import { cleanupUnfinishedUpload } from "../assets/cleanup-unfinished-upload.mjs";

export function cleanupExpiredVideoUploads(resources, options) {
  return cleanupUnfinishedUpload(resources, "video", options);
}
