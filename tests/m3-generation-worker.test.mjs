import assert from "node:assert/strict";
import test from "node:test";
import { resolveStoredGenerationCompletion } from "../server/generation/worker-service.mjs";

test("stored generation reports success only after database completion", async () => {
  let discardCalls = 0;
  const resolution = await resolveStoredGenerationCompletion({
    completion: { completed: true, reason: "completed" },
    discard: async () => {
      discardCalls += 1;
    },
  });

  assert.deepEqual(resolution, { outcome: "succeeded" });
  assert.equal(discardCalls, 0);
});

test("stored generation discards an orphan after a terminal failure wins", async () => {
  let discardCalls = 0;
  const resolution = await resolveStoredGenerationCompletion({
    completion: { completed: false, reason: "failed" },
    discard: async () => {
      discardCalls += 1;
    },
  });

  assert.deepEqual(resolution, {
    completionReason: "failed",
    objectDiscarded: true,
    outcome: "superseded",
  });
  assert.equal(discardCalls, 1);
});

test("stored generation keeps an object when another lease may still accept it", async () => {
  let discardCalls = 0;
  const resolution = await resolveStoredGenerationCompletion({
    completion: { completed: false, reason: "lease_lost" },
    discard: async () => {
      discardCalls += 1;
    },
  });

  assert.deepEqual(resolution, {
    completionReason: "lease_lost",
    objectDiscarded: false,
    outcome: "superseded",
  });
  assert.equal(discardCalls, 0);
});

test("stored generation exposes an orphan cleanup failure", async () => {
  const resolution = await resolveStoredGenerationCompletion({
    completion: { completed: false, reason: "cancelled" },
    discard: async () => {
      throw new Error("object storage unavailable");
    },
  });

  assert.deepEqual(resolution, {
    code: "OBJECT_DELETE_FAILED",
    completionReason: "cancelled",
    objectDiscarded: false,
    outcome: "orphaned",
  });
});
