import { CanvasProjectError } from "./errors.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9_:.\-]{0,159}$/;
const NODE_TYPES = new Set(["sourceImage", "sourceVideo", "sourceAudio", "imageGenerator", "imageResult"]);
const ASSET_KINDS = new Set(["reference", "generated", "video", "audio"]);
const RESOLUTIONS = new Set(["1K", "2K", "4K"]);
const MAX_DOCUMENT_BYTES = 1024 * 1024;

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
  record(value, ["id", "type", "position", "size", "asset", "jobId", "index", "name", "metadata"]);
  const type = value.type;
  if (!NODE_TYPES.has(type)) throw invalid();
  const result = { id: nodeId(value.id), type, position: position(value.position) };
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
      type === "sourceAudio" && value.asset.kind !== "audio") throw invalid();
    result.asset = { id: uuid(value.asset.id), kind: value.asset.kind };
  } else if (type.startsWith("source")) {
    throw invalid("未完成上传的素材只能保存在本机。");
  }
  if (value.jobId !== undefined) {
    if (type !== "imageResult") throw invalid();
    result.jobId = uuid(value.jobId);
  } else if (type === "imageResult") throw invalid();
  if (value.index !== undefined) {
    if (type !== "imageResult" || !Number.isSafeInteger(value.index) || value.index < 0 || value.index > 1000) throw invalid();
    result.index = value.index;
  }
  if (value.name !== undefined) {
    if (type === "imageGenerator" || type === "imageResult") throw invalid();
    result.name = string(value.name, 255);
  }
  if (value.metadata !== undefined) {
    if (type === "imageGenerator" || type === "imageResult") throw invalid();
    record(value.metadata, ["pixelWidth", "pixelHeight", "fps", "durationSeconds"]);
    result.metadata = {};
    for (const key of ["pixelWidth", "pixelHeight", "fps", "durationSeconds"]) {
      if (value.metadata[key] === undefined) continue;
      result.metadata[key] = finite(value.metadata[key], 0, 1_000_000);
    }
  }
  return result;
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
  record(value.draft, ["prompt", "modelKey", "ratio", "resolution", "count"]);
  const draft = value.draft;
  if (draft.modelKey !== null) string(draft.modelKey, 80);
  if (typeof draft.ratio !== "string" || !/^\d{1,2}:\d{1,2}$/.test(draft.ratio) ||
    !RESOLUTIONS.has(draft.resolution) || ![1, 2, 4].includes(draft.count)) throw invalid();
  if (!Array.isArray(value.directReferenceIds) || value.directReferenceIds.length > 10) throw invalid();
  const directReferenceIds = value.directReferenceIds.map(uuid);
  if (new Set(directReferenceIds).size !== directReferenceIds.length) throw invalid();
  return {
    draft: { prompt: string(draft.prompt, 4000, { empty: true, multiline: true }), modelKey: draft.modelKey,
      ratio: draft.ratio, resolution: draft.resolution, count: draft.count },
    directReferenceIds,
  };
}

export function validateCanvasProjectId(value) {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new CanvasProjectError("CANVAS_PROJECT_NOT_FOUND", "未找到该画布项目。", 404);
  }
  return value;
}

export function validateCanvasProjectSave(value) {
  record(value, ["expectedVersion", "name", "document"]);
  if (value.expectedVersion !== null &&
    (!Number.isSafeInteger(value.expectedVersion) || value.expectedVersion < 1)) throw invalid();
  const name = string(value.name, 20).trim();
  if (!name) throw invalid("画布名称不能为空。");
  const source = record(value.document, ["schemaVersion", "nodes", "edges", "generators", "convertedReferences", "viewport"]);
  if (source.schemaVersion !== 1 || !Array.isArray(source.nodes) || source.nodes.length > 1000 ||
    !Array.isArray(source.edges) || source.edges.length > 3000) throw invalid();
  const nodes = source.nodes.map(node);
  const ids = new Set(nodes.map((item) => item.id));
  if (ids.size !== nodes.length) throw invalid();
  const edges = source.edges.map((item) => edge(item, ids));
  if (new Set(edges.map((item) => item.id)).size !== edges.length) throw invalid();
  record(source.generators, Object.keys(source.generators ?? {}));
  const generators = {};
  for (const [id, value] of Object.entries(source.generators)) {
    nodeId(id);
    if (!nodes.some((item) => item.id === id && item.type === "imageGenerator")) throw invalid();
    generators[id] = generator(value);
  }
  if (nodes.some((item) => item.type === "imageGenerator" && !generators[item.id])) throw invalid();
  const convertedReferences = {};
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
  const document = { schemaVersion: 1, nodes, edges, generators, convertedReferences, viewport };
  if (Buffer.byteLength(JSON.stringify({ name, document }), "utf8") > MAX_DOCUMENT_BYTES) {
    throw new CanvasProjectError("PAYLOAD_TOO_LARGE", "画布项目超过 1 MB 限制。", 413);
  }
  return { expectedVersion: value.expectedVersion, name, document };
}

export const canvasProjectBodyLimit = MAX_DOCUMENT_BYTES;
