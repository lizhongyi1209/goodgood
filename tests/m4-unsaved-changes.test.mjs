import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createComposerCheckpoint,
  hasMeaningfulUnsavedChanges,
} from "../features/projects/unsaved-changes.mjs";

const blankDraft = Object.freeze({
  aspectRatio: "4:5",
  count: 1,
  modelId: "nano-banana-2",
  prompt: "",
  references: [],
  resolution: "2K",
});

test("meaningful composer changes ignore surrounding prompt whitespace but retain settings and reference order", () => {
  const checkpoint = createComposerCheckpoint(blankDraft);
  assert.equal(
    hasMeaningfulUnsavedChanges({
      checkpoint,
      current: createComposerCheckpoint({ ...blankDraft, prompt: "   " }),
    }),
    false,
  );
  assert.equal(
    hasMeaningfulUnsavedChanges({
      checkpoint,
      current: createComposerCheckpoint({ ...blankDraft, prompt: "保留这段输入" }),
    }),
    true,
  );
  assert.equal(
    hasMeaningfulUnsavedChanges({
      checkpoint,
      current: createComposerCheckpoint({ ...blankDraft, resolution: "4K" }),
    }),
    true,
  );

  const references = [
    { id: "reference-a", status: "ready" },
    { id: "reference-b", status: "uploading" },
  ];
  assert.notEqual(
    createComposerCheckpoint({ ...blankDraft, references }),
    createComposerCheckpoint({ ...blankDraft, references: [...references].reverse() }),
  );
});

test("unprojected generation work is meaningful even when composer inputs match", () => {
  const checkpoint = createComposerCheckpoint(blankDraft);
  assert.equal(
    hasMeaningfulUnsavedChanges({
      checkpoint,
      current: checkpoint,
      hasUnprojectedWork: true,
    }),
    true,
  );
});

test("new creation and project restore require an explicit discard action while active generation stays protected", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /const requestNewCreation = \(\) =>/);
  assert.match(page, /if \(isGenerating\)/);
  assert.match(page, /if \(hasUnsavedCreationChanges\)/);
  assert.match(page, /setDestructiveCreationIntent\(\{ kind: "new" \}\)/);
  assert.match(page, /当前修改尚未保存/);
  assert.match(page, /继续编辑/);
  assert.match(page, /放弃修改并新建/);
  assert.match(page, /放弃修改并打开/);
  assert.match(page, /setComposerCheckpoint\(createComposerCheckpoint\(restoredProject\.state\)\)/);
  assert.match(page, /onClick=\{requestNewCreation\}/);
  assert.match(styles, /\.unsaved-changes-dialog/);
});
