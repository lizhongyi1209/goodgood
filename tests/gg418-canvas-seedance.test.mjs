import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoProviderBody, videoGenerationProblem } from "../shared/contracts/video-generation.mjs";
import { CANVAS_SEEDANCE_MODELS, seedanceVideoProviderModel } from "../shared/contracts/seedance-video-generation.mjs";
import { validateVideoGeneration, validateVideoDraft } from "../server/video-generation/validation.mjs";
import { normalizeVideoTask, videoProviderEndpoint, createVideoProviderTask, queryVideoProviderTask } from "../server/video-generation/provider.mjs";
import { quoteVideoCredits, settledVideoCredits } from "../server/video-generation/pricing.mjs";
import { videoInputHash } from "../server/video-generation/repository.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForType, canvasVideoDraftForModel, canvasVideoTypeAvailability, canvasVideoParameterVisibility } from "../features/canvas/canvas-video-material-modes.mjs";
import { isCanvasVideoGenerationConnection } from "../features/canvas/canvas-video-generation-input.mjs";
import { canvasVideoGenerationBatchInputs } from "../features/canvas/canvas-video-generation-batch.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { readAudioMetadata } from "../server/audio-materials/metadata.mjs";
import { readMp4Metadata } from "../server/video-generation/mp4.mjs";
import { readVideoInputs } from "../server/video-generation/media.mjs";

// All transports below are injected synthetic functions, with no DB/queue/provider targets.
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const config = { kind: "o1key", apiKey: "synthetic-seedance-key", baseUrl: "https://example.test/v1" };
function draft(patch = {}) { return { ...defaultVideoGenerationDraft(), modelId: "seedance-2-5", seedanceLine: "standard", prompt: "人物缓慢抬头", multiShot: false, aspectRatio: "adaptive", ...patch }; }
function input(patch = {}) { const { materials, roles, ...fields } = draft(); return { ...fields, requestId: uuid(1), projectId: uuid(2), media: [], ...patch }; }
const material = (kind, n, role) => ({ kind, assetKind: kind === "image" ? "reference" : kind, assetId: uuid(n), name: `${kind}-${n}`, role });
const modeInput = (kind, n) => ({ kind, key: `edge:${kind}-${n}` });

test("eight routes share explicit roles/scalars while provider IDs stay distinct", () => {
  const expected = {
    standard: ["doubao-seedance-2-5-260628-max", "doubao-seedance-2-0-260128-max", "doubao-seedance-2-0-fast-260128-max", "doubao-seedance-2-0-mini-260615-max"],
    backup: ["dreamina-seedance-2-5-hc", "dreamina-seedance-2-0-hc", "dreamina-seedance-2-0-fast-hc", "dreamina-seedance-2-0-mini-hc"],
  };
  for (const seedanceLine of ["standard", "backup"]) for (const [index, model] of CANVAS_SEEDANCE_MODELS.entries()) {
    const value = validateVideoGeneration(input({ modelId: model.id, seedanceLine, type: "reference_to_video", audio: "native",
      media: [material("image", 3, "refer_image"), material("video", 4, "feature_video"), material("audio", 5, "reference_audio")] }));
    const body = videoProviderBody(value, value.media.map((item) => ({ ...item, url: `https://example.test/${item.assetId}` })));
    assert.equal(body.model, expected[seedanceLine][index]);
    assert.equal(seedanceVideoProviderModel(model.id, seedanceLine), body.model);
    assert.deepEqual(body.content.map((item) => item.role), [undefined, "reference_image", "reference_video", "reference_audio"]);
    assert.equal(body.content[0].text, value.prompt); assert.equal(body.generate_audio, true); assert.equal(body.watermark, false);
    for (const field of ["contents", "settings", "options", "multi_shot", "shots", "character_orientation"]) assert.equal(body[field], undefined);
    assert.equal(videoProviderEndpoint(config, model.id).pathname, "/v1/video/generations");
  }
  assert.equal(seedanceVideoProviderModel("seedance-2-5", "unconfigured"), undefined);
});

test("official special constraints reject the wrapper's conflicting edit/extend examples", () => {
  const original = material("video", 4, "base_video");
  const edit = validateVideoGeneration(input({ type: "video_edit", duration: -1, media: [original] }));
  const payload = videoProviderBody(edit, [{ ...original, url: "https://example.test/original.mov" }]);
  assert.equal(payload.duration, -1); assert.equal(payload.ratio, "adaptive"); assert.equal(payload.omni_reference_task_type, "edit");
  assert.throws(() => validateVideoGeneration({ ...edit, duration: 8 }), /跟随原视频/);
  assert.throws(() => validateVideoGeneration({ ...edit, aspectRatio: "16:9" }), /跟随素材/);
  assert.throws(() => validateVideoGeneration(input({ type: "video_extend", aspectRatio: "16:9", media: [original] })), /跟随素材/);
  for (const type of ["image_to_video", "first_last_frame"]) {
    assert.throws(() => validateVideoGeneration(input({ type, aspectRatio: "16:9", media: [material("image", 3, "first_frame")] })), /跟随素材/);
    const frame = validateVideoGeneration(input({ type, media: [material("image", 3, "first_frame")] }));
    assert.equal(videoProviderBody(frame, frame.media.map((item) => ({ ...item, url: "https://example.test/frame.png" }))).omni_reference_task_type, undefined);
  }
  assert.throws(() => validateVideoGeneration(input({ modelId: "seedance-2-0", type: "video_edit", duration: -1, media: [original] })), /不支持/);
  assert.throws(() => validateVideoGeneration(input({ modelId: "seedance-2-0-fast", resolution: "1080p" })), /分辨率/);
});

test("empty/duplicate/overflow/audio-only inputs and exact reference limits are model-specific", () => {
  assert.match(videoGenerationProblem(input({ prompt: " " })), /描述/);
  assert.throws(() => validateVideoGeneration(input({ seedanceLine: "wrong" })), /参数/);
  const audios = [material("audio", 5, "reference_audio")];
  assert.doesNotThrow(() => validateVideoGeneration(input({ type: "reference_to_video", media: audios })));
  assert.throws(() => validateVideoGeneration(input({ modelId: "seedance-2-0", type: "reference_to_video", media: audios })), /搭配图片或视频/);
  assert.throws(() => validateVideoGeneration(input({ type: "reference_to_video", media: [...audios, ...audios] })), /重复/);
  for (const [modelId, maximum] of [["seedance-2-0", 9], ["seedance-2-5", 30]]) {
    const images = Array.from({ length: maximum + 1 }, (_, n) => material("image", n + 10, "refer_image"));
    assert.doesNotThrow(() => validateVideoGeneration(input({ modelId, type: "reference_to_video", media: images.slice(0, maximum) })));
    assert.throws(() => validateVideoGeneration(input({ modelId, type: "reference_to_video", media: images })), /数量/);
  }
  assert.throws(() => validateVideoGeneration(input({ type: "first_last_frame", media: [material("image", 3, "last_frame")] })), /首帧/);
  assert.throws(() => validateVideoGeneration(input({ type: "first_last_frame", media: [material("image", 3, "first_frame"), ...audios] })), /图片/);
  assert.throws(() => validateVideoGeneration(input({ duration: 31 })), /参数/);
});

test("modes follow ordered media; model switches retain compatible inputs and frozen identities", () => {
  const image = modeInput("image", 1); const audio = modeInput("audio", 1);
  const options = canvasVideoTypeAvailability([image], "seedance-2-5");
  assert.equal(options.find((item) => item.id === "text_to_video").enabled, false);
  assert.equal(options.find((item) => item.id === "first_last_frame").enabled, true);
  const frames = canvasVideoDraftForMaterials(draft(), [image]);
  assert.equal(frames.type, "image_to_video"); assert.equal(frames.roles[image.key], "first_frame");
  const reference = canvasVideoDraftForMaterials(frames, [image, audio]);
  assert.equal(reference.type, "reference_to_video"); assert.equal(reference.roles[audio.key], "reference_audio");
  const editing = canvasVideoDraftForType(reference, "video_edit", [image, audio, modeInput("video", 1)]);
  assert.equal(editing.duration, -1); assert.equal(editing.aspectRatio, "adaptive");
  assert.deepEqual(canvasVideoParameterVisibility("video_edit", [], "seedance-2-5"), { aspectRatio: false, duration: false, audio: true, storyboard: false });
  const frozen = input({ seedanceLine: "backup" });
  const value = draft({ requestId: frozen.requestId, lastInput: frozen, seedanceLine: "backup", duration: 30 });
  const many = [...Array.from({ length: 12 }, (_, n) => modeInput("image", n)), ...Array.from({ length: 4 }, (_, n) => modeInput("video", n)), audio];
  const plan = canvasVideoDraftForModel(value, "seedance-2-0", many);
  assert.equal(plan.draft.seedanceLine, "backup"); assert.equal(plan.draft.duration, 15); assert.equal(plan.draft.lastInput, frozen);
  assert.equal(plan.removedKeys.length, 4);
  const kling = canvasVideoDraftForModel(reference, "kling-3.0-omni", [image, audio]);
  assert.deepEqual(kling.removedKeys, [audio.key]); assert.equal(kling.draft.seedanceLine, undefined);
});

test("automatic prices reserve a cap and settle only the frozen per-second rate", () => {
  const auto = quoteVideoCredits(input({ duration: -1 }), [], {});
  assert.equal(auto.credits, 480); assert.equal(auto.seconds, 30); assert.equal(auto.automaticDuration, true);
  assert.equal(settledVideoCredits(auto, 6), 96); assert.equal(settledVideoCredits(auto, 6.1), 112);
  assert.equal(settledVideoCredits(auto, 50), 480); assert.equal(settledVideoCredits(auto, null), 480);
  const edited = quoteVideoCredits(input({ type: "video_edit", duration: -1 }), [{ kind: "video", durationSeconds: 8.1 }], {});
  assert.equal(edited.credits, 144); assert.equal(settledVideoCredits(edited, 8), 128);
  const environment = { GOODGOOD_VIDEO_CREDIT_RATES_JSON: JSON.stringify({ "seedance-2-5": { standard: { "720p": 7 }, backup: { "720p": 11 } }, "kling-3.0-omni": { "720p": 3 } }) };
  assert.equal(quoteVideoCredits(input(), [], environment).credits, 35);
  assert.equal(quoteVideoCredits(input({ seedanceLine: "backup" }), [], environment).credits, 55);
  assert.equal(settledVideoCredits(quoteVideoCredits(input(), [], environment), 4), 35);
  assert.notEqual(videoInputHash(input()), videoInputHash(input({ seedanceLine: "backup" })));
  assert.equal(videoInputHash(input({ quotedCredits: 35 })), videoInputHash(input({ quotedCredits: 55 })));
});

test("Seedance preparing/progress/failure/completion envelopes normalize independently of Kling", () => {
  const pending = normalizeVideoTask({ id: "task_seed", status: "in_progress", progress: 0, metadata: { upstream_status: "preparing" } }, null, "seedance-2-5");
  assert.equal(pending.state, "running"); assert.equal(pending.progress, 0);
  const failed = normalizeVideoTask({ id: "task_seed", status: "failed", progress: 100, error: { code: "InvalidImage", message: "@Image1 invalid" } }, "task_seed", "seedance-2-5");
  assert.equal(failed.state, "failed"); assert.equal(failed.videoUrl, null);
  const done = normalizeVideoTask({ id: "task_seed", status: "completed", seconds: "8", metadata: { outputs: ["https://example.test/result.mp4"], usage: { completion_tokens: 123, total_tokens: 125 } } }, "task_seed", "seedance-2-5");
  assert.equal(done.state, "succeeded"); assert.equal(done.durationSeconds, 8); assert.deepEqual(done.providerUsage, { completionTokens: 123, totalTokens: 125 });
  assert.throws(() => normalizeVideoTask({ id: "other", status: "queued" }, "task_seed", "seedance-2-5"), /回执/);
});

test("injected transport issues one paid POST; known task queries use GET and original identity", async () => {
  const requests = [];
  const transport = async (url, options) => { requests.push({ url: String(url), options }); return new Response(JSON.stringify({ id: "task_seed", status: options.method === "POST" ? "queued" : "in_progress", progress: options.method === "POST" ? 0 : 42 })); };
  const submitted = await createVideoProviderTask(config, input({ seedanceLine: "backup" }), [], transport);
  const queried = await queryVideoProviderTask(config, input({ seedanceLine: "backup" }), submitted.taskId, transport);
  assert.equal(queried.progress, 42); assert.deepEqual(requests.map((item) => item.options.method), ["POST", "GET"]);
  assert.equal(requests[1].url, "https://example.test/v1/video/generations/task_seed");
  assert.equal(JSON.parse(requests[0].options.body).model, "dreamina-seedance-2-5-hc");
  let paidPosts = 0;
  await assert.rejects(() => createVideoProviderTask(config, input(), [], async () => { paidPosts++; throw new Error("synthetic timeout"); }), (error) => error.code === "VIDEO_SUBMISSION_UNKNOWN");
  assert.equal(paidPosts, 1);
});

test("audio connections/save and independent count slots keep line and frozen media", () => {
  const saved = { expectedVersion: null, name: "Seedance 项目", document: { schemaVersion: 1,
    nodes: [{ id: "audio-1", type: "sourceAudio", name: "参考.wav", position: { x: 0, y: 0 }, asset: { kind: "audio", id: uuid(5) } },
      { id: "video-1", type: "videoGenerator", position: { x: 350, y: 0 }, videoGeneration: draft({ seedanceLine: "backup" }) }],
    edges: [{ id: "audio-input", source: "audio-1", sourceHandle: "audio", target: "video-1", targetHandle: "reference" }], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } } };
  const valid = validateCanvasProjectSave(saved);
  assert.equal(valid.document.nodes[1].videoGeneration.seedanceLine, "backup");
  const nodes = [{ id: "audio-1", type: "sourceAudio" }, { id: "video-1", type: "videoGenerator", data: { videoGeneration: draft() } }];
  assert.equal(isCanvasVideoGenerationConnection(saved.document.edges[0], nodes, []), true);
  assert.equal(isCanvasVideoGenerationConnection(saved.document.edges[0], [nodes[0], { ...nodes[1], data: { videoGeneration: defaultVideoGenerationDraft() } }], []), false);
  let next = 10;
  const value = input({ seedanceLine: "backup", type: "reference_to_video", media: [material("audio", 5, "reference_audio")] });
  const batch = canvasVideoGenerationBatchInputs(value, 4, () => uuid(next++));
  assert.equal(new Set(batch.map((item) => item.requestId)).size, 4);
  for (const item of batch) { assert.equal(item.seedanceLine, "backup"); assert.deepEqual(item.media, value.media); }
  assert.equal(validateVideoDraft(draft({ requestId: value.requestId, lastInput: value })).lastInput.seedanceLine, "backup");
});

function box(type, payload) { const header = Buffer.alloc(8); header.writeUInt32BE(payload.length + 8); header.write(type, 4); return Buffer.concat([header, payload]); }
function movie(brand = "isom", frameRate = 30) {
  const tkhd = Buffer.alloc(84); tkhd.writeInt32BE(65536, 40); tkhd.writeInt32BE(65536, 56); tkhd.writeUInt32BE(1280 * 65536, 76); tkhd.writeUInt32BE(720 * 65536, 80);
  const mdhd = Buffer.alloc(24); mdhd.writeUInt32BE(3000, 12); mdhd.writeUInt32BE(18000, 16);
  const hdlr = Buffer.alloc(20); hdlr.write("vide", 8);
  const stts = Buffer.alloc(16); stts.writeUInt32BE(1, 4); stts.writeUInt32BE(6 * frameRate, 8); stts.writeUInt32BE(3000 / frameRate, 12);
  return Buffer.concat([box("ftyp", Buffer.from(`${brand}0000`)), box("moov", box("trak", Buffer.concat([box("tkhd", tkhd), box("mdia", Buffer.concat([box("mdhd", mdhd), box("hdlr", hdlr), box("minf", box("stbl", box("stts", stts)))]))])))]);
}
function wav(seconds) {
  const bytes = Buffer.alloc(44 + seconds * 16000); bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36); bytes.writeUInt32LE(bytes.length - 44, 40); return bytes;
}
test("bounded metadata readers recover actual WAV/MP3 time and MP4/MOV frame timing", () => {
  assert.equal(readAudioMetadata(wav(8)).durationSeconds, 8);
  const tampered = wav(8); tampered.writeUInt32LE(100, 28); assert.throws(() => readAudioMetadata(tampered), /音频/);
  const frame = Buffer.alloc(417); frame.writeUInt32BE(0xfffb9000); const mp3 = Buffer.concat(Array.from({ length: 100 }, () => frame));
  assert.ok(Math.abs(readAudioMetadata(mp3).durationSeconds - 100 * 1152 / 44100) < .001);
  assert.throws(() => readAudioMetadata(Buffer.from("not audio bytes")), /音频/);
  assert.equal(readMp4Metadata(movie()).frameRate, 30);
  assert.equal(readMp4Metadata(movie("qt  "), { allowMov: true }).durationSeconds, 6);
  assert.throws(() => readMp4Metadata(movie("qt  ")), /MP4/);
});

test("authorized original bytes enforce source FPS/duration/totals before any provider transport", async () => {
  const ownerId = uuid(100); const workspaceId = uuid(101);
  let privateReads = 0;
  const objects = new Map([[uuid(4), movie()], [uuid(5), wav(8)], [uuid(6), wav(8)], [uuid(7), movie("isom", 10)], [uuid(8), movie()]]);
  const resources = { config: { objectStorage: { bucket: "synthetic-private" } }, pool: { async query(_sql, [assetId, actor, workspace]) {
    return { rows: objects.has(assetId) && actor === ownerId && workspace === workspaceId ? [{ id: assetId, object_key: assetId, declared_mime_type: "video/mp4" }] : [] };
  } }, storage: { async send(command) { privateReads++; const bytes = objects.get(command.input.Key); return { ContentLength: bytes.length, Body: { transformToByteArray: async () => bytes } }; } } };
  const metadata = await readVideoInputs(resources, { input: input({ type: "reference_to_video", media: [material("video", 4, "feature_video")] }), ownerId, workspaceId });
  assert.equal(metadata[0].durationSeconds, 6); assert.equal(metadata[0].frameRate, 30); assert.equal(metadata[0].url, undefined);
  await assert.rejects(() => readVideoInputs(resources, { input: input({ type: "reference_to_video", media: [material("video", 7, "feature_video")] }), ownerId, workspaceId }), (error) => error.code === "VIDEO_FRAME_RATE_INVALID");
  await assert.rejects(() => readVideoInputs(resources, { input: input({ modelId: "seedance-2-0", type: "reference_to_video", media: [material("video", 4, "feature_video"), material("audio", 5, "reference_audio"), material("audio", 6, "reference_audio")] }), ownerId, workspaceId }), (error) => error.code === "VIDEO_REFERENCE_DURATION_INVALID");
  const before = privateReads;
  await assert.rejects(() => readVideoInputs(resources, { input: input({ media: [material("video", 4, "feature_video")] }), ownerId: uuid(999), workspaceId }), (error) => error.code === "VIDEO_MATERIAL_UNAVAILABLE");
  assert.equal(privateReads, before);
});
