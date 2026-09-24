import { cleanupUnfinishedUpload } from "../assets/cleanup-unfinished-upload.mjs";

export function cleanupExpiredAudioUploads(resources, options) {
  return cleanupUnfinishedUpload(resources, "audio", options);
}
