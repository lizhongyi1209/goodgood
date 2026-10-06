import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoGenerationProblem, videoProviderBody } from "../shared/contracts/video-generation.mjs";
import { validateVideoGeneration, validateVideoDraft } from "../server/video-generation/validation.mjs";
import { quoteVideoCredits } from "../server/video-generation/pricing.mjs";
import { createVideoProviderTask, normalizeVideoTask, videoProviderEndpoint } from "../server/video-generation/provider.mjs";
import { videoInputHash } from "../server/video-generation/repository.mjs";
import { processVideoGeneration } from "../server/video-generation/worker.mjs";
import { readMp4Metadata } from "../server/video-generation/mp4.mjs";
import { isPublicVideoAddress } from "../server/video-generation/download.mjs";
import { isCanvasVideoGenerationConnection } from "../features/canvas/canvas-video-generation-input.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
const id = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const imageId = "00000000-0000-4000-8000-000000000003";
const videoId = "00000000-0000-4000-8000-000000000004";
function input(patch = {}) { const { materials, roles, ...draft } = defaultVideoGenerationDraft(); return { ...draft, requestId: id, projectId, prompt: "镜头缓慢推进", media: [], ...patch }; }
const image = (role = "first_frame") => ({ kind: "image", assetKind: "reference", assetId: imageId, name: "角色.png", role });
const video = (role = "video") => ({ kind: "video", assetKind: "video", assetId: videoId, name: "动作.mp4", role });
const config = { kind: "o1key", apiKey: "synthetic-video-credential", baseUrl: "https://example.test/v1" };
test("Omni uses the attached reseller route/body and retains a single task identity", () => {
  const draft = validateVideoGeneration(input({ type: "first_last_frame", media: [image(), { ...image("last_frame"), assetId: videoId }] }));
  const payload = videoProviderBody(draft, draft.media.map((item) => ({ ...item, url: "data:image/png;base64,c3ludGhldGlj" })));
  assert.equal(videoProviderEndpoint(config, draft.modelId).pathname, "/kling/omni-video/kling-3.0-omni");
  assert.deepEqual(payload.contents.map((item) => item.type), ["prompt", "first_frame", "last_frame"]);
  assert.equal(payload.options.external_task_id, id); assert.equal(payload.options.watermark_info.enabled, false);
  assert.equal(payload.model, undefined); assert.equal(payload.settings.aspect_ratio, undefined);
  assert.equal(payload.settings.duration, 5); assert.equal(payload.settings.audio, "off");
});
test("empty, incompatible, duplicate and last-frame-only requests fail before dispatch", () => {
  assert.match(videoGenerationProblem(input({ prompt: "" })), /描述/);
  assert.throws(() => validateVideoGeneration(input({ type: "first_last_frame", media: [image("last_frame")] })), /首帧/);
  assert.throws(() => validateVideoGeneration(input({ media: [image()] })), /不匹配/);
  assert.throws(() => validateVideoGeneration(input({ type: "image_to_video", media: [image(), image()] })), /重复/);
  assert.throws(() => validateVideoGeneration({ ...input(), token: "not-allowed" }), /参数/);
});
test("motion has no Omni-only parameters and enforces exactly one image/video", () => {
  const draft = validateVideoGeneration(input({ type: "motion_control", modelId: "kling-3.0", prompt: "", audio: "original", media: [image("image"), video()] }));
  const payload = videoProviderBody(draft, draft.media.map((item) => ({ ...item, url: "https://example.test/synthetic-material" })));
  assert.deepEqual(payload.settings, { resolution: "720p", character_orientation: "video", audio: "original" });
  assert.equal(videoProviderEndpoint(config, draft.modelId, "task-1").pathname, "/kling/motion-control/kling-3.0/task-1");
  assert.throws(() => validateVideoGeneration({ ...draft, resolution: "4k" }), /分辨率/);
  assert.throws(() => validateVideoGeneration({ ...draft, media: [image("image")] }), /角色图片/);
});
test("reference-video and base-video impose opposite multi-shot/audio rules", () => {
  assert.throws(() => validateVideoGeneration(input({ type: "reference_to_video", multiShot: false, media: [video("feature_video")] })), /多镜头/);
  assert.doesNotThrow(() => validateVideoGeneration(input({ type: "reference_to_video", multiShot: true, media: [video("feature_video")] })));
  assert.throws(() => validateVideoGeneration(input({ type: "video_edit", multiShot: true, media: [video("base_video")] })), /单镜头/);
  assert.doesNotThrow(() => validateVideoGeneration(input({ type: "video_edit", multiShot: false, audio: "original", media: [video("base_video")] })));
});
test("manual shots validate totals; incomplete drafts can be saved without submitting", () => {
  const draft = input({ prompt: "", multiShot: true, shots: [{ seconds: 2, text: "人物抬头" }, { seconds: 3, text: "镜头拉远" }] });
  assert.doesNotThrow(() => validateVideoGeneration(draft));
  assert.match(videoProviderBody(draft, []).contents[0].text, /shot 1, 2s/);
  assert.throws(() => validateVideoGeneration({ ...draft, duration: 6 }), /之和/);
  assert.doesNotThrow(() => validateVideoDraft({ ...defaultVideoGenerationDraft(), multiShot: true, shots: [{ seconds: 5, text: "" }] }));
});
test("credits are model/resolution/time quotes, missing prices fail closed and motion rounds upward", () => {
  const environment = { GOODGOOD_VIDEO_CREDIT_RATES_JSON: JSON.stringify({ "kling-3.0-omni": { "720p": 7, "1080p": 11 }, "kling-3.0": { "720p": 4 } }) };
  assert.equal(quoteVideoCredits(input(), [], environment).credits, 35);
  assert.equal(quoteVideoCredits(input({ resolution: "1080p", duration: 8 }), [], environment).credits, 88);
  assert.equal(quoteVideoCredits(input({ type: "motion_control", modelId: "kling-3.0" }), [{ kind: "video", durationSeconds: 6.1 }], environment).credits, 28);
  assert.throws(() => quoteVideoCredits(input(), [], {}), (error) => error.code === "VIDEO_UNPRICED");
  assert.throws(() => quoteVideoCredits(input(), [], { GOODGOOD_VIDEO_CREDIT_RATES_JSON: "invalid" }), (error) => error.code === "VIDEO_PRICING_UNAVAILABLE");
});
test("reseller query envelope is distinct from the official task envelope", () => {
  assert.equal(normalizeVideoTask({ task_id: "t1", status: "IN_PROGRESS", progress: 30 }, "t1").state, "running");
  const result = normalizeVideoTask({ task_id: "t1", status: "SUCCESS", video_url: "https://example.test/result.mp4", cost: "3.825", duration: 5 }, "t1");
  assert.equal(result.state, "succeeded"); assert.equal(result.providerCost, "3.825");
  assert.throws(() => normalizeVideoTask({ data: [{ task_id: "t1", status: "succeeded", outputs: [] }] }), /回执/);
  assert.throws(() => normalizeVideoTask({ task_id: "other", status: "SUCCESS", video_url: "https://example.test/result.mp4" }, "t1"), /回执/);
});
test("a lost paid create response is never posted again and credential echoes are redacted", async () => {
  let requests = 0;
  await assert.rejects(() => createVideoProviderTask(config, input(), [], async () => { requests += 1; throw new Error("synthetic network interruption"); }), (error) => error.code === "VIDEO_SUBMISSION_UNKNOWN");
  assert.equal(requests, 1);
  await assert.rejects(() => createVideoProviderTask(config, input(), [], async () => new Response(JSON.stringify({ message: `bad credential ${config.apiKey}` }), { status: 500 })), (error) => {
    assert.equal(error.code, "VIDEO_SUBMISSION_UNKNOWN"); assert.ok(!JSON.stringify(error.diagnostics).includes(config.apiKey)); return true;
  });
});
test("job identity freezes provider input but is independent of the accepted credit quote", () => {
  assert.equal(videoInputHash(input({ quotedCredits: 35 })), videoInputHash(input({ quotedCredits: 50 })));
  assert.notEqual(videoInputHash(input()), videoInputHash(input({ prompt: "镜头拉远" })));
});
test("a resumable draft keeps frozen inputs bound to its request and rejects nested or mismatched snapshots", () => {
  const draft = { ...defaultVideoGenerationDraft(), requestId: id, lastInput: input({ quotedCredits: 35 }) };
  assert.equal(validateVideoDraft(draft).lastInput.quotedCredits, 35);
  assert.throws(() => validateVideoDraft({ ...draft, requestId: projectId }), /参数/);
  assert.throws(() => validateVideoDraft({ ...draft, lastInput: { ...draft.lastInput, lastInput: draft.lastInput } }), /参数/);
});
test("uncertain submissions hold their slot; failed saving never creates another paid task", async () => {
  const queries = [];
  const resources = { config: { provider: config }, pool: { query: async (sql, values) => { queries.push({ sql, values }); return { rows: [{}], rowCount: 1 }; } } };
  const job = { id, state: "queued", input_snapshot: input(), owner_id: projectId, workspace_id: imageId };
  let creates = 0;
  const dependencies = { readInputs: async () => [], createTask: async () => { creates += 1; throw Object.assign(new Error("synthetic timeout"), { code: "VIDEO_SUBMISSION_UNKNOWN" }); } };
  await processVideoGeneration(resources, job, "synthetic-lease", dependencies);
  assert.equal(creates, 1); assert.ok(queries.some(({ values }) => values?.includes("submission_unknown")));
  await processVideoGeneration(resources, { ...job, state: "submission_unknown" }, "synthetic-lease", dependencies);
  assert.equal(creates, 1);
  await processVideoGeneration(resources, { ...job, state: "saving", provider_result_url: "https://example.test/result.mp4" }, "synthetic-lease", { ...dependencies, download: async () => { throw new Error("synthetic save failure"); } });
  assert.equal(creates, 1); assert.ok(queries.some(({ values }) => values?.includes("save_failed")));
});
function box(type, payload) { const header = Buffer.alloc(8); header.writeUInt32BE(payload.length + 8); header.write(type, 4); return Buffer.concat([header, payload]); }
test("MP4 metadata comes from its video track, not untrusted browser dimensions", () => {
  const ftyp = box("ftyp", Buffer.from("isom0000isommp42")); const tkhd = Buffer.alloc(84); tkhd.writeInt32BE(65536, 40); tkhd.writeInt32BE(65536, 56); tkhd.writeUInt32BE(1920 * 65536, 76); tkhd.writeUInt32BE(1080 * 65536, 80);
  const mdhd = Buffer.alloc(24); mdhd.writeUInt32BE(1000, 12); mdhd.writeUInt32BE(6500, 16);
  const hdlr = Buffer.alloc(20); hdlr.write("vide", 8);
  const bytes = Buffer.concat([ftyp, box("moov", box("trak", Buffer.concat([box("tkhd", tkhd), box("mdia", Buffer.concat([box("mdhd", mdhd), box("hdlr", hdlr)]))])))]);
  assert.deepEqual(readMp4Metadata(bytes), { pixelWidth: 1920, pixelHeight: 1080, durationSeconds: 6.5 });
  assert.throws(() => readMp4Metadata(Buffer.from("not a video")), /MP4/);
});
test("output downloads reject private/loopback addresses and mixed input edges reject cycles", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.1.1", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fc00::1"]) assert.equal(isPublicVideoAddress(address), false);
  assert.equal(isPublicVideoAddress("8.8.8.8"), true);
  const nodes = [{ id: "text", type: "textEditor" }, { id: "video", type: "videoGenerator" }, { id: "source", type: "sourceVideo" }];
  const edge = { source: "text", target: "video", sourceHandle: "text", targetHandle: "reference" };
  assert.equal(isCanvasVideoGenerationConnection(edge, nodes, []), true);
  assert.equal(isCanvasVideoGenerationConnection(edge, nodes, [{ source: "video", target: "text" }]), false);
  assert.equal(isCanvasVideoGenerationConnection({ source: "source", target: "video", sourceHandle: "video", targetHandle: "reference" }, nodes, []), true);
});
test("canvas persistence accepts empty video drafts and mixed text/video ports without storing URLs", () => {
  const document = { schemaVersion: 1, nodes: [
    { id: "text-1", type: "textEditor", position: { x: 0, y: 0 }, markdown: "镜头推进", text: "镜头推进" },
    { id: "video-1", type: "videoGenerator", position: { x: 350, y: 0 }, videoGeneration: defaultVideoGenerationDraft() },
    { id: "video-2", type: "videoGenerator", position: { x: 700, y: 0 }, videoGeneration: defaultVideoGenerationDraft() },
  ], edges: [
    { id: "text-to-video", source: "text-1", target: "video-1", sourceHandle: "text", targetHandle: "reference" },
    { id: "video-to-video", source: "video-1", target: "video-2", sourceHandle: "video", targetHandle: "reference" },
  ], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  const saved = validateCanvasProjectSave({ name: "合成视频项目", expectedVersion: null, document });
  assert.equal(saved.document.nodes[1].type, "videoGenerator");
  assert.equal(saved.document.edges.length, 2);
  assert.throws(() => validateCanvasProjectSave({ name: "合成视频项目", expectedVersion: null, document: { ...document, nodes: document.nodes.map((node) => node.id === "video-1" ? { ...node, videoGeneration: { ...node.videoGeneration, providerUrl: "https://example.test/private" } } : node) } }), /参数/);
});
