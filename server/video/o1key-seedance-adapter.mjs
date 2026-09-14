import { seedanceResolutions } from "../../shared/contracts/seedance-models.mjs";
const VIDEO_MODEL_IDS = Object.freeze([
  "seedance-2-5",
  "seedance-2-0",
  "seedance-2-0-fast",
  "seedance-2-0-mini",
]);

const VIDEO_RATIOS = new Set([
  "adaptive",
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
  "21:9",
]);

const VIDEO_RESOLUTIONS = new Set(["480p", "720p", "1080p", "4K"]);
const MATERIAL_TYPES = new Set(["image", "video", "audio"]);

export const O1KEY_SEEDANCE_ROUTES = Object.freeze({
  standard: Object.freeze({
    providerType: "doubao",
    models: Object.freeze({
      "seedance-2-5": "doubao-seedance-2-5-260628-max",
      "seedance-2-0": "doubao-seedance-2-0-260128-max",
      "seedance-2-0-fast": "doubao-seedance-2-0-fast-260128-max",
      "seedance-2-0-mini": "doubao-seedance-2-0-mini-260615-max",
    }),
  }),
  backup: Object.freeze({
    providerType: "hc",
    models: Object.freeze({
      "seedance-2-5": "dreamina-seedance-2-5-hc",
      "seedance-2-0": "dreamina-seedance-2-0-hc",
      "seedance-2-0-fast": "dreamina-seedance-2-0-fast-hc",
      "seedance-2-0-mini": "dreamina-seedance-2-0-mini-hc",
    }),
  }),
});

export class SeedanceProviderError extends Error {
  constructor({ code, message, retryable = false, status = 502 }) {
    super(message);
    this.name = "SeedanceProviderError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

function invalid(message) {
  throw new SeedanceProviderError({
    code: "INVALID_VIDEO_REQUEST",
    message,
    status: 400,
  });
}

function nonEmptyString(value, name) {
  if (typeof value !== "string" || !value.trim()) invalid(`${name} is required.`);
  return value.trim();
}

function providerReferenceUrl(value) {
  const raw = nonEmptyString(value, "Reference URL");
  if (raw.startsWith("asset://")) return raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    invalid("Reference URL must be an asset reference or an HTTP(S) URL.");
  }
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    invalid("Reference URL must be an asset reference or an HTTP(S) URL.");
  }
  return parsed.toString();
}

function publicMaterialUrl(value, line) {
  const url = providerReferenceUrl(value);
  if (url.startsWith("asset://")) invalid("Material creation requires a public URL.");
  if (line === "backup" && new URL(url).protocol !== "https:") {
    invalid("HC references must use HTTPS.");
  }
  return url;
}

function mediaContent(reference) {
  if (!reference || typeof reference !== "object") invalid("Reference is invalid.");
  const url = providerReferenceUrl(reference.url);
  const definitions = {
    image: { field: "image_url", role: "reference_image" },
    video: { field: "video_url", role: "reference_video" },
    audio: { field: "audio_url", role: "reference_audio" },
  };
  const definition = definitions[reference.mediaType];
  if (!definition) invalid("Reference media type is unsupported.");
  const allowedRole = reference.mediaType === "image"
    ? new Set(["first_frame", "last_frame", "reference_image"])
    : new Set([definition.role]);
  if (!allowedRole.has(reference.role)) invalid("Reference role does not match its media type.");
  return {
    [definition.field]: { url },
    role: reference.role,
    type: definition.field,
  };
}

function validateReferenceMode(references, generationMode) {
  if (generationMode === "first_last_frame") {
    if (references.length < 1 || references.length > 2) {
      invalid("First/last-frame mode requires one or two images.");
    }
    if (references.some((item) => item.mediaType !== "image")) {
      invalid("First/last-frame mode accepts images only.");
    }
    const roles = references.map((item) => item.role);
    if (roles[0] !== "first_frame" || (roles.length === 2 && roles[1] !== "last_frame")) {
      invalid("First/last-frame references must be ordered first frame then last frame.");
    }
    return;
  }
  if (generationMode !== "multimodal") invalid("Video generation mode is unsupported.");
  if (references.some((item) => item.role === "first_frame" || item.role === "last_frame")) {
    invalid("Multimodal mode cannot mix frame and reference roles.");
  }
  const hasAudio = references.some((item) => item.mediaType === "audio");
  const hasVisual = references.some((item) =>
    item.mediaType === "image" || item.mediaType === "video"
  );
  if (hasAudio && !hasVisual) invalid("Reference audio requires an image or video reference.");
}

export function resolveO1KeySeedanceRoute({ line, modelId }) {
  if (!VIDEO_MODEL_IDS.includes(modelId)) invalid("Video model is unsupported.");
  const selectedLine = O1KEY_SEEDANCE_ROUTES[line];
  if (!selectedLine) invalid("Video provider line is unsupported.");
  return Object.freeze({
    line,
    modelId,
    providerModel: selectedLine.models[modelId],
    providerType: selectedLine.providerType,
    routeVersion: `o1key-${selectedLine.providerType}-${modelId}-v1`,
  });
}

export function buildO1KeySeedanceAssetPayload({
  assetType = "image",
  line,
  modelId,
  name,
  url,
}) {
  const route = resolveO1KeySeedanceRoute({ line, modelId });
  if (!MATERIAL_TYPES.has(assetType)) invalid("Material type is unsupported.");
  const normalizedName = typeof name === "string" ? name.trim() : "";
  return Object.freeze({
    type: route.providerType,
    url: publicMaterialUrl(url, line),
    ...(normalizedName ? { name: normalizedName } : {}),
    asset_type: assetType,
    ...(route.providerType === "doubao" ? { model: route.providerModel } : {}),
  });
}

export function buildO1KeySeedanceVideoPayload({
  duration,
  generateAudio,
  generationMode,
  line,
  modelId,
  prompt,
  ratio,
  references = [],
  resolution,
}) {
  const route = resolveO1KeySeedanceRoute({ line, modelId });
  const normalizedPrompt = nonEmptyString(prompt, "Video prompt");
  if (!Array.isArray(references)) invalid("Video references must be an array.");
  validateReferenceMode(references, generationMode);
  if (!Number.isInteger(duration)) invalid("Video duration must be an integer.");
  const maximumDuration = modelId === "seedance-2-5" ? 30 : 15;
  if (duration < 4 || duration > maximumDuration) invalid("Video duration is unsupported.");
  if (!VIDEO_RESOLUTIONS.has(resolution) || !seedanceResolutions(modelId).includes(resolution)) invalid("Video resolution is unsupported.");
  if (!VIDEO_RATIOS.has(ratio)) invalid("Video ratio is unsupported.");
  if (typeof generateAudio !== "boolean") invalid("Video audio setting is required.");

  return Object.freeze({
    model: route.providerModel,
    content: Object.freeze([
      Object.freeze({ type: "text", text: normalizedPrompt }),
      ...references.map((reference) => Object.freeze(mediaContent(reference))),
    ]),
    duration,
    resolution: resolution === "4K" ? "4k" : resolution,
    ratio,
    generate_audio: generateAudio,
  });
}

function validatedBaseUrl(value, allowInsecureLoopback) {
  const raw = nonEmptyString(value, "Seedance provider base URL");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Seedance provider base URL is invalid.");
  }
  const loopback = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(allowInsecureLoopback && loopback)) {
    throw new Error("Seedance provider base URL must use HTTPS.");
  }
  return url.toString().replace(/\/$/, "");
}

function providerFailure(response, payload) {
  const providerMessage = typeof payload?.error === "string"
    ? payload.error
    : typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : "Seedance provider request failed.";
  return new SeedanceProviderError({
    code: response.status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_REJECTED",
    message: providerMessage,
    retryable: response.status === 429 || response.status >= 500,
    status: 502,
  });
}

function requiredIdentifier(value, name) {
  const identifier = nonEmptyString(value, name);
  if (!/^[A-Za-z0-9._:-]+$/.test(identifier)) invalid(`${name} is invalid.`);
  return identifier;
}

export function createO1KeySeedanceClient({
  allowInsecureLoopback = false,
  apiKey,
  baseUrl,
  fetchImpl = fetch,
  requestTimeoutMs = 15_000,
}) {
  const endpoint = validatedBaseUrl(baseUrl, allowInsecureLoopback);
  const token = nonEmptyString(apiKey, "Seedance provider API key");
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new Error("Seedance provider request timeout must be a positive integer.");
  }

  async function request(path, { method = "GET", payload } = {}) {
    let response;
    try {
      response = await fetchImpl(`${endpoint}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(payload ? { "content-type": "application/json" } : {}),
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new SeedanceProviderError({
        code: "PROVIDER_UNAVAILABLE",
        message: "Seedance provider is temporarily unavailable.",
        retryable: true,
        status: 503,
      });
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new SeedanceProviderError({
        code: "PROVIDER_MALFORMED_RESPONSE",
        message: "Seedance provider returned an invalid response.",
      });
    }
    if (!response.ok) throw providerFailure(response, body);
    return body;
  }

  return Object.freeze({
    async createAsset(input) {
      const route = resolveO1KeySeedanceRoute(input);
      const body = await request("/v1/seedance/assets", {
        method: "POST",
        payload: buildO1KeySeedanceAssetPayload(input),
      });
      if (!body?.success || !body.data?.Id || !body.data?.Ref || !body.data?.Status) {
        throw new SeedanceProviderError({
          code: "PROVIDER_MALFORMED_RESPONSE",
          message: "Seedance material creation returned an invalid response.",
        });
      }
      return Object.freeze({ ...body.data, providerType: route.providerType });
    },

    async getAsset({ assetId, line, modelId }) {
      const route = resolveO1KeySeedanceRoute({ line, modelId });
      const id = requiredIdentifier(assetId, "Seedance material ID");
      const body = await request(
        `/v1/seedance/assets/${encodeURIComponent(id)}?type=${encodeURIComponent(route.providerType)}`,
      );
      if (!body?.success || !body.data?.Id || !body.data?.Status) {
        throw new SeedanceProviderError({
          code: "PROVIDER_MALFORMED_RESPONSE",
          message: "Seedance material status returned an invalid response.",
        });
      }
      return Object.freeze({ ...body.data, providerType: route.providerType });
    },

    async createVideo(input) {
      const body = await request("/v1/video/generations", {
        method: "POST",
        payload: buildO1KeySeedanceVideoPayload(input),
      });
      const taskId = body?.task_id ?? body?.id;
      if (!taskId || !body?.status) {
        throw new SeedanceProviderError({
          code: "PROVIDER_MALFORMED_RESPONSE",
          message: "Seedance video creation returned an invalid response.",
        });
      }
      return Object.freeze({ ...body, taskId });
    },

    async getVideo({ taskId }) {
      const id = requiredIdentifier(taskId, "Seedance task ID");
      const body = await request(`/v1/video/generations/${encodeURIComponent(id)}`);
      if (!(body?.task_id ?? body?.id) || !body?.status) {
        throw new SeedanceProviderError({
          code: "PROVIDER_MALFORMED_RESPONSE",
          message: "Seedance video status returned an invalid response.",
        });
      }
      return Object.freeze({ ...body, taskId: body.task_id ?? body.id });
    },
  });
}
