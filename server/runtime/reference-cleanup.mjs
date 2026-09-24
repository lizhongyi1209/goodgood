import {
  closeGenerationResources,
  getGenerationResources,
  prepareObjectStorage,
} from "../generation/resources.mjs";
import {
  cleanupReferenceAssets,
  previewReferenceCleanup,
} from "../references/cleanup-service.mjs";
import { loadReferenceRetentionPolicy } from "../references/retention.mjs";
import { cleanupExpiredVideoUploads } from "../video-materials/cleanup.mjs";
import { cleanupExpiredAudioUploads } from "../audio-materials/cleanup.mjs";

const arguments_ = process.argv.slice(2);
const unknown = arguments_.filter((argument) => argument !== "--execute");
if (unknown.length) {
  throw new Error(`Unknown reference cleanup argument: ${unknown[0]}`);
}

const execute = arguments_.includes("--execute");
const policy = loadReferenceRetentionPolicy();
const resources = await getGenerationResources();

try {
  if (!execute) {
    const preview = await previewReferenceCleanup(resources, { policy });
    const video = await cleanupExpiredVideoUploads(resources);
    const audio = await cleanupExpiredAudioUploads(resources);
    console.log(
      JSON.stringify({
        event: "reference.cleanup_preview",
        mode: "dry-run",
        ...preview,
        video,
        audio,
      }),
    );
  } else {
    await prepareObjectStorage(resources);
    const result = await cleanupReferenceAssets(resources, { policy });
    const video = await cleanupExpiredVideoUploads(resources, { execute: true });
    const audio = await cleanupExpiredAudioUploads(resources, { execute: true });
    console.log(
      JSON.stringify({
        event: "reference.cleanup_complete",
        mode: "execute",
        ...result,
        video,
        audio,
      }),
    );
    if (result.failed > 0 || result.lostLease > 0 || video.failed > 0 || audio.failed > 0) process.exitCode = 1;
  }
} finally {
  await closeGenerationResources();
}
