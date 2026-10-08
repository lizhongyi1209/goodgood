import { CanvasProjectError } from "./errors.mjs";
import { validateVideoDraft } from "../video-generation/validation.mjs";
import { getTextGenerationModel, getTextGenerationPreset, DEFAULT_TEXT_GENERATION_MODEL, TEXT_GENERATION_MAX_PROMPT, TEXT_GENERATION_MAX_HISTORY } from "../../shared/contracts/text-generation.mjs";
import { validateM3GenerationInput, validateIdempotencyKey } from "../generation/api.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9_:.\-]{0,159}$/;
const NODE_TYPES = new Set(["sourceImage", "sourceVideo", "sourceAudio", "imageGenerator", "imageResult", "textEditor", "textGenerator", "videoGenerator", "group"]);
const ASSET_KINDS = new Set(["reference", "generated", "video", "audio"]);
const RESOLUTIONS = new Set(["1K", "2K", "4K"]);
const MAX_DOCUMENT_BYTES = 1024 * 1024;
const MAX_PAGES = 10;
const PAGE_CONTENT_KEYS = ["nodes", "edges", "generators", "convertedReferences", "viewport"];

function invalid(message = "画布项目内容无效，请刷新后重试。") {
  return new CanvasProjectError("INVALID_CANVAS_PROJECT", message, 400);
}

function record(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))) throw invalid();
  return value;
}

function string(value, max, { empty = false, multiline = false } = {}) {
  if (typeof value !== "string" || value.length > max || (!empty && !value.length) ||
    (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) throw invalid();
  return value;
}

function finite(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw invalid();
  return value;
}

function uuid(value) {
  if (typeof value !== "string" || !UUID.test(value)) throw invalid();
  return value;
}

function nodeId(value) {
  if (typeof value !== "string" || !NODE_ID.test(value)) throw invalid();
  return value;
}

function position(value) {
  record(value, ["x", "y"]);
  return { x: finite(value.x, -10_000_000, 10_000_000), y: finite(value.y, -10_000_000, 10_000_000) };
}

function node(value) {
  record(value, ["id", "type", "position", "size", "asset", "jobId", "jobIds", "imageSlots", "index", "sequence", "name", "metadata", "markdown", "text", "textGeneration", "videoGeneration", "parentId", "emoji", "groupSizing"]);
  const type = value.type;
  if (!NODE_TYPES.has(type)) throw invalid();
  const result = { id: nodeId(value.id), type, position: position(value.position) };
  if (value.parentId !== undefined) {
    if (type === "group") throw invalid("组不能嵌套，请先解散组。");
    result.parentId = nodeId(value.parentId);
  }
  if (type === "group") {
    if (value.asset !== undefined || value.jobId !== undefined || value.metadata !== undefined || !value.size) throw invalid();
    const name = string(value.name, 80).trim();
    if (!name) throw invalid("组名称不能为空。");
    result.name = name;
  }
  if (value.emoji !== undefined) {
    if (type !== "group") throw invalid();
    const emoji = string(value.emoji, 32);
    if ([...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(emoji)].length !== 1 ||
        !/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(emoji)) throw invalid();
    result.emoji = emoji;
  }
  if (value.groupSizing !== undefined) {
    if (type !== "group" || !["auto", "manual"].includes(value.groupSizing)) throw invalid();
    result.groupSizing = value.groupSizing;
  }
  if (type === "textEditor" || type === "textGenerator") {
    result.markdown = string(value.markdown, 100_000, { empty: true, multiline: true });
    result.text = string(value.text, 16_000, { empty: true, multiline: true });
    if (value.metadata !== undefined || value.asset !== undefined) throw invalid();
  } else if (value.markdown !== undefined || value.text !== undefined) throw invalid();
  if (type === "textGenerator") {
    const draft = value.textGeneration ?? { modelId: DEFAULT_TEXT_GENERATION_MODEL, prompt: "" };
    record(draft, ["modelId", "prompt", "presetId", "history", "pendingRequestId"]);
    if (!getTextGenerationModel(draft.modelId)) throw invalid();
    if (draft.presetId !== undefined && !getTextGenerationPreset(draft.presetId)) throw invalid();
    const history = draft.history ?? [];
    if (!Array.isArray(history) || history.length > TEXT_GENERATION_MAX_HISTORY) throw invalid();
    result.textGeneration = { modelId: draft.modelId, prompt: string(draft.prompt, TEXT_GENERATION_MAX_PROMPT, { empty: true, multiline: true }),
      ...(draft.presetId ? { presetId: draft.presetId } : {}),
      history: history.map((message) => {
        record(message, ["role", "content"]);
        if (!["user", "assistant"].includes(message.role)) throw invalid();
        return { role: message.role, content: string(message.content, message.role === "assistant" ? 16_000 : TEXT_GENERATION_MAX_PROMPT, { empty: true, multiline: true }) };
      }), ...(draft.pendingRequestId ? { pendingRequestId: uuid(draft.pendingRequestId) } : {}) };
  } else if (value.textGeneration !== undefined) throw invalid();
  if (type === "videoGenerator") {
    try { result.videoGeneration = validateVideoDraft(value.videoGeneration); } catch { throw invalid("视频节点参数无效，请重新选择参数。"); }
  } else if (value.videoGeneration !== undefined) throw invalid();
  if (value.size !== undefined) {
    record(value.size, ["width", "height"]);
    result.size = { width: finite(value.size.width, 1, 100_000), height: finite(value.size.height, 1, 100_000) };
  }
  if (value.asset !== undefined) {
    record(value.asset, ["id", "kind"]);
    if (!ASSET_KINDS.has(value.asset.kind)) throw invalid();
    if (type === "imageGenerator" || type === "imageResult" ||
      type === "sourceImage" && !["reference", "generated"].includes(value.asset.kind) ||
      type === "sourceVideo" && value.asset.kind !== "video" ||
      type === "videoGenerator" && value.asset.kind !== "video" ||
      type === "sourceAudio" && value.asset.kind !== "audio") throw invalid();
    result.asset = { id: uuid(value.asset.id), kind: value.asset.kind };
  } else if (type.startsWith("source")) {
    throw invalid("未完成上传的素材只能保存在本机。");
  }
  if (value.jobId !== undefined) {
    if (type !== "imageResult" && type !== "imageGenerator") throw invalid();
    result.jobId = uuid(value.jobId);
  } else if (type === "imageResult") throw invalid();
  if (value.jobIds !== undefined) {
    if (type !== "imageGenerator" || !Array.isArray(value.jobIds) || !value.jobIds.length) throw invalid();
    result.jobIds = value.jobIds.map(uuid);
    if (new Set(result.jobIds).size !== result.jobIds.length ||
        result.jobId && result.jobId !== result.jobIds[0]) throw invalid();
  }
  if (value.imageSlots !== undefined) {
    if (type !== "imageGenerator" || !Array.isArray(value.imageSlots)) throw invalid();
    result.imageSlots = value.imageSlots.map(imageSlot);
    if (new Set(result.imageSlots.map((slot) => slot.id)).size !== result.imageSlots.length) throw invalid();
  }
  if (value.index !== undefined) {
    if (type !== "imageResult" || !Number.isSafeInteger(value.index) || value.index < 0 || value.index > 1000) throw invalid();
    result.index = value.index;
  }
  if (value.sequence !== undefined) {
    if (type !== "imageGenerator" || !Number.isSafeInteger(value.sequence) || value.sequence < 1 || value.sequence > 10_000_000) throw invalid();
    result.sequence = value.sequence;
  }
  if (value.name !== undefined) {
    if (type === "imageGenerator" || type === "imageResult") throw invalid();
    result.name = type === "group" ? result.name : string(value.name, 255);
  }
  if (value.metadata !== undefined) {
    if (type === "imageGenerator" || type === "imageResult") throw invalid();
    // Accept FPS from earlier snapshots, but stop carrying it into new saves.
    record(value.metadata, ["pixelWidth", "pixelHeight", "fps", "durationSeconds"]);
    result.metadata = {};
    for (const key of ["pixelWidth", "pixelHeight", "durationSeconds"]) {
      if (value.metadata[key] === undefined) continue;
      result.metadata[key] = finite(value.metadata[key], 0, 1_000_000);
    }
  }
  return result;
}

function imageSlot(value) {
  record(value, ["id", "requestKey", "retryOfJobId", "jobId", "outputIndex", "input", "error"]);
  record(value.input, ["prompt", "references", "modelId", "imageLine", "routingPolicy", "catalogModelId", "expectedPriceVersion",
    "aspectRatio", "resolution", "count", "thinkingLevel", "googleSearch", "quality", "background", "outputFormat", "projectId", "canvasProjectId"]);
  const names = new Map();
  if (!Array.isArray(value.input.references)) throw invalid();
  for (const reference of value.input.references) {
    record(reference, ["id", "name", "status", "url"]);
    if (reference.url !== "" || reference.status !== "ready") throw invalid();
    names.set(uuid(reference.id), string(reference.name, 255));
  }
  let input;
  try { input = validateM3GenerationInput(value.input); } catch { throw invalid(); }
  if (input.routingPolicy !== "canvas-image-v1" || input.projectId || !input.canvasProjectId && !value.jobId) throw invalid();
  const slot = { id: nodeId(value.id), input: { ...input, references: input.references.map(({ id }) => ({
    id, name: names.get(id), status: "ready", url: "",
  })) } };
  if (value.requestKey !== undefined) {
    try { slot.requestKey = validateIdempotencyKey(value.requestKey); } catch { throw invalid(); }
  }
  if (value.jobId !== undefined) slot.jobId = uuid(value.jobId);
  if (value.retryOfJobId !== undefined) slot.retryOfJobId = uuid(value.retryOfJobId);
  if (value.outputIndex !== undefined) {
    if (!Number.isSafeInteger(value.outputIndex) || value.outputIndex < 0 || value.outputIndex > 1000) throw invalid();
    slot.outputIndex = value.outputIndex;
  }
  if (value.error !== undefined) {
    record(value.error, ["code", "title", "message", "retryable"]);
    if (!["MODEL_TIMEOUT", "MODEL_REJECTED", "CAPACITY_BUSY", "SUBMISSION_UNKNOWN", "INTERNAL_ERROR"].includes(value.error.code) ||
      typeof value.error.retryable !== "boolean") throw invalid();
    slot.error = { code: value.error.code, title: string(value.error.title, 120), message: string(value.error.message, 1000), retryable: value.error.retryable };
  }
  return slot;
}

function edge(value, ids) {
  record(value, ["id", "source", "target", "sourceHandle", "targetHandle"]);
  const result = { id: nodeId(value.id), source: nodeId(value.source), target: nodeId(value.target) };
  if (!ids.has(result.source) || !ids.has(result.target)) throw invalid();
  for (const key of ["sourceHandle", "targetHandle"]) {
    const handle = value[key];
    if (handle !== null && handle !== undefined) string(handle, 64);
    result[key] = handle ?? null;
  }
  return result;
}

function generator(value) {
  record(value, ["draft", "directReferenceIds"]);
  record(value.draft, ["prompt", "modelKey", "ratio", "resolution", "count", "quality", "background", "outputFormat"]);
  const draft = value.draft;
  if (draft.modelKey !== null) string(draft.modelKey, 80);
  if (draft.quality !== undefined && !["auto", "low", "medium", "high", "xhigh", "max"].includes(draft.quality) ||
    draft.background !== undefined && !["auto", "transparent"].includes(draft.background) ||
    draft.outputFormat !== undefined && !["png", "jpeg", "webp"].includes(draft.outputFormat) ||
    draft.background === "transparent" && draft.outputFormat === "jpeg") throw invalid();
  if (typeof draft.ratio !== "string" || !(draft.ratio === "adaptive" || /^\d{1,2}:\d{1,2}$/.test(draft.ratio)) ||
    !RESOLUTIONS.has(draft.resolution) || !Number.isSafeInteger(draft.count) || draft.count < 1 || draft.count > 12) throw invalid();
  if (!Array.isArray(value.directReferenceIds) || value.directReferenceIds.length > 10) throw invalid();
  const directReferenceIds = value.directReferenceIds.map(uuid);
  if (new Set(directReferenceIds).size !== directReferenceIds.length) throw invalid();
  return {
    // A batch source contains many per-job prompts; the document envelope bounds storage.
    draft: { prompt: string(draft.prompt, MAX_DOCUMENT_BYTES, { empty: true, multiline: true }), modelKey: draft.modelKey,
      ratio: draft.ratio, resolution: draft.resolution, count: draft.count,
      ...(draft.quality !== undefined ? { quality: draft.quality } : {}),
      ...(draft.background !== undefined ? { background: draft.background } : {}),
      ...(draft.outputFormat !== undefined ? { outputFormat: draft.outputFormat } : {}) },
    directReferenceIds,
  };
}

export function validateCanvasProjectId(value) {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new CanvasProjectError("CANVAS_PROJECT_NOT_FOUND", "未找到该画布项目。", 404);
  }
  return value;
}

function expectedVersion(value, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) throw invalid();
  return value;
}

export function validateCanvasProjectRename(value) {
  record(value, ["name", "expectedVersion"]);
  const name = string(value.name, 20).trim();
  if (!name) throw invalid("画布名称不能为空。");
  return { name, expectedVersion: expectedVersion(value.expectedVersion) };
}

export function validateCanvasProjectDelete(value) {
  record(value, ["expectedVersion"]);
  return { expectedVersion: expectedVersion(value.expectedVersion, { nullable: true }) };
}

function pageContent(source) {
  if (!Array.isArray(source.nodes) || source.nodes.length > 1000 ||
    !Array.isArray(source.edges) || source.edges.length > 3000) throw invalid();
  const nodes = source.nodes.map(node);
  const ids = new Set(nodes.map((item) => item.id));
  if (ids.size !== nodes.length) throw invalid();
  const edges = source.edges.map((item) => edge(item, ids));
  const byId = new Map(nodes.map((item) => [item.id, item]));
  for (const item of nodes) {
    if (item.parentId && byId.get(item.parentId)?.type !== "group") throw invalid("组成员必须属于当前页面中的组。");
  }
  for (const item of edges) {
    const sourceType = byId.get(item.source)?.type;
    const targetType = byId.get(item.target)?.type;
    if (sourceType === "group" || targetType === "group") throw invalid("请连接组内节点。");
    if (item.source === item.target) throw invalid();
    if (targetType === "textGenerator" || targetType === "videoGenerator") {
      if (item.targetHandle !== "reference" || !(
        ["textEditor", "textGenerator"].includes(sourceType) && item.sourceHandle === "text" ||
        ["sourceImage", "imageResult", "imageGenerator"].includes(sourceType) && item.sourceHandle === "reference" ||
        ["sourceVideo", "videoGenerator"].includes(sourceType) && item.sourceHandle === "video" ||
        targetType === "videoGenerator" && sourceType === "sourceAudio" && item.sourceHandle === "audio")) throw invalid();
    } else if (item.sourceHandle === "text" || item.targetHandle === "text" || sourceType === "textEditor" || sourceType === "textGenerator" || targetType === "textEditor") {
      if (item.sourceHandle !== "text" || !["reference", "text"].includes(item.targetHandle) ||
          !["textEditor", "textGenerator"].includes(sourceType) || targetType !== "imageGenerator") throw invalid();
      item.targetHandle = "reference";
    }
  }
  if (new Set(edges.map((item) => item.id)).size !== edges.length) throw invalid();
  record(source.generators, Object.keys(source.generators ?? {}));
  const generators = Object.create(null);
  for (const [id, value] of Object.entries(source.generators)) {
    nodeId(id);
    if (!nodes.some((item) => item.id === id && item.type === "imageGenerator")) throw invalid();
    generators[id] = generator(value);
  }
  if (nodes.some((item) => item.type === "imageGenerator" && !generators[item.id])) throw invalid();
  const convertedReferences = Object.create(null);
  if (source.convertedReferences !== undefined) {
    record(source.convertedReferences, Object.keys(source.convertedReferences ?? {}));
    const edgeIds = new Set(edges.map((item) => item.id));
    for (const [id, referenceId] of Object.entries(source.convertedReferences)) {
      if (!edgeIds.has(id)) throw invalid();
      convertedReferences[id] = uuid(referenceId);
    }
  }
  record(source.viewport, ["x", "y", "zoom"]);
  const viewport = {
    x: finite(source.viewport.x, -10_000_000, 10_000_000),
    y: finite(source.viewport.y, -10_000_000, 10_000_000),
    zoom: finite(source.viewport.zoom, 0.01, 16),
  };
  return { nodes, edges, generators, convertedReferences, viewport };
}

function page(value) {
  record(value, ["id", "name", ...PAGE_CONTENT_KEYS]);
  const name = string(value.name, 40).trim();
  if (!name || Array.from(name).length > 20) throw invalid("页面名称应为 1–20 个字符。");
  return { id: nodeId(value.id), name, ...pageContent(value) };
}

export function validateCanvasProjectSave(value) {
  record(value, ["expectedVersion", "name", "document"]);
  if (value.expectedVersion !== null &&
    (!Number.isSafeInteger(value.expectedVersion) || value.expectedVersion < 1)) throw invalid();
  const name = string(value.name, 20).trim();
  if (!name) throw invalid("画布名称不能为空。");
  let document;
  if (value.document?.schemaVersion === 1) {
    record(value.document, ["schemaVersion", ...PAGE_CONTENT_KEYS]);
    document = { schemaVersion: 1, ...pageContent(value.document) };
  } else {
    record(value.document, ["schemaVersion", "pages"]);
    if (value.document.schemaVersion !== 2 || !Array.isArray(value.document.pages) ||
      value.document.pages.length < 1 || value.document.pages.length > MAX_PAGES) throw invalid();
    const pages = value.document.pages.map(page);
    const nodes = pages.flatMap((item) => item.nodes);
    const edges = pages.flatMap((item) => item.edges);
    if (new Set(pages.map((item) => item.id)).size !== pages.length ||
      nodes.length > 1000 || edges.length > 3000 ||
      new Set(nodes.map((item) => item.id)).size !== nodes.length ||
      new Set(edges.map((item) => item.id)).size !== edges.length) throw invalid();
    document = { schemaVersion: 2, pages };
  }
  if (Buffer.byteLength(JSON.stringify({ name, document }), "utf8") > MAX_DOCUMENT_BYTES) {
    throw new CanvasProjectError("PAYLOAD_TOO_LARGE", "画布项目超过 1 MB 限制。", 413);
  }
  return { expectedVersion: value.expectedVersion, name, document };
}

export const canvasProjectBodyLimit = MAX_DOCUMENT_BYTES;
