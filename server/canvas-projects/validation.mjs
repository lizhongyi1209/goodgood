import { CanvasProjectError } from "./errors.mjs";
import { countPromptCharacters, PROMPT_DRAFT_MAX_LENGTH } from "../../shared/contracts/generation-prompt-limits.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9_:.\-]{0,159}$/;
const NODE_TYPES = new Set(["sourceImage", "sourceVideo", "sourceAudio", "imageGenerator", "imageResult", "textEditor"]);
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

function string(value, max, { empty = false, multiline = false, characters = false } = {}) {
  if (typeof value !== "string" || (characters ? countPromptCharacters(value) : value.length) > max || (!empty && !value.length) ||
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
  record(value, ["id", "type", "position", "size", "asset", "jobId", "index", "sequence", "name", "metadata", "markdown", "text"]);
  const type = value.type;
  if (!NODE_TYPES.has(type)) throw invalid();
  const result = { id: nodeId(value.id), type, position: position(value.position) };
  if (type === "textEditor") {
    result.markdown = string(value.markdown, 100_000, { empty: true, multiline: true });
    result.text = string(value.text, PROMPT_DRAFT_MAX_LENGTH, { empty: true, multiline: true, characters: true });
    if (value.metadata !== undefined || value.asset !== undefined) throw invalid();
  } else if (value.markdown !== undefined || value.text !== undefined) throw invalid();
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
    if (type !== "imageResult" && type !== "imageGenerator") throw invalid();
    result.jobId = uuid(value.jobId);
  } else if (type === "imageResult") throw invalid();
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
    result.name = string(value.name, 255);
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
    draft: { prompt: string(draft.prompt, PROMPT_DRAFT_MAX_LENGTH, { empty: true, multiline: true, characters: true }), modelKey: draft.modelKey,
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
  for (const item of edges) {
    if (item.sourceHandle === "text" || item.targetHandle === "text" || byId.get(item.source)?.type === "textEditor" || byId.get(item.target)?.type === "textEditor") {
      if (item.sourceHandle !== "text" || !["reference", "text"].includes(item.targetHandle) ||
          byId.get(item.source)?.type !== "textEditor" || byId.get(item.target)?.type !== "imageGenerator") throw invalid();
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
