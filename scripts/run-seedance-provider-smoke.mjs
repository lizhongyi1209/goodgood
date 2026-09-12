import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  SeedanceProviderError,
  createO1KeySeedanceClient,
} from "../server/video/o1key-seedance-adapter.mjs";

const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 15 * 60 * 1_000;

function argumentValue(argumentsList, name) {
  const index = argumentsList.indexOf(name);
  return index < 0 ? null : argumentsList[index + 1] ?? null;
}

function usage() {
  return [
    "Usage:",
    "  npm run video:provider-smoke -- --execute --key-file <path>",
    "",
    "This submits one real standard-line Seedance 2.5 task:",
    "4 seconds, 480p, 16:9, silent, text-to-video.",
  ].join("\n");
}

async function readApiKey(fileName) {
  const raw = (await readFile(path.resolve(fileName), "utf8")).replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (lines.length !== 1) {
    throw new Error("The temporary key file must contain exactly one non-empty line.");
  }
  return lines[0];
}

async function main(argumentsList = process.argv.slice(2)) {
  if (!argumentsList.includes("--execute")) {
    throw new Error(`Real provider execution requires --execute.\n${usage()}`);
  }
  const keyFile = argumentValue(argumentsList, "--key-file");
  if (!keyFile) throw new Error(`--key-file is required.\n${usage()}`);

  const apiKey = await readApiKey(keyFile);
  const client = createO1KeySeedanceClient({
    apiKey,
    baseUrl: "https://cf-api.o1key.com",
    requestTimeoutMs: 30_000,
  });
  const startedAt = Date.now();
  const submitted = await client.createVideo({
    duration: 4,
    generateAudio: false,
    generationMode: "multimodal",
    line: "standard",
    modelId: "seedance-2-5",
    prompt: "A calm sunrise over a quiet lake, fixed camera, gentle natural motion.",
    ratio: "16:9",
    references: [],
    resolution: "480p",
  });
  console.log(JSON.stringify({
    event: "submitted",
    model: submitted.model,
    status: submitted.status,
    taskId: submitted.taskId,
  }));

  let previousMarker = "";
  while (Date.now() - startedAt <= POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const current = await client.getVideo({ taskId: submitted.taskId });
    const marker = `${current.status}:${current.progress ?? ""}`;
    if (marker !== previousMarker) {
      console.log(JSON.stringify({
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1_000),
        event: "poll",
        progress: current.progress ?? null,
        status: current.status,
      }));
      previousMarker = marker;
    }
    if (current.status === "completed") {
      console.log(JSON.stringify({
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1_000),
        event: "completed",
        hasOutput: Boolean(
          current.result_url || current.metadata?.url || current.metadata?.outputs?.length,
        ),
        model: current.model ?? submitted.model,
        taskId: current.taskId,
      }));
      return;
    }
    if (current.status === "failed") {
      throw new Error("The real Seedance task failed.");
    }
  }
  throw new Error("Timed out waiting for the real Seedance task.");
}

main().catch((error) => {
  console.error(JSON.stringify({
    code: error instanceof SeedanceProviderError ? error.code : "SMOKE_FAILED",
    event: "failed",
    message: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});

