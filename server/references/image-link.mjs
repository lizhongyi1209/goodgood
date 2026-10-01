import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { REFERENCE_LIMITS, REFERENCE_MIME_TYPES } from "./constants.mjs";
import { ReferenceRequestError } from "./errors.mjs";
import { inspectReferenceImage } from "./validation.mjs";

const MAX_URL_LENGTH = 4096;
const MAX_JSON_BYTES = 8192;
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const IPV4_BLOCKS = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["168.63.129.16", 32],
];

function ipv4Number(address) {
  return address.split(".").reduce((value, octet) => value * 256 + Number(octet), 0);
}

function ipv6Number(address) {
  const [left, right] = address.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const groups = right === undefined ? head : [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail];
  return groups.reduce((value, group) => (value << 16n) + BigInt(`0x${group}`), 0n);
}

function inIpv6Prefix(address, network, bits) {
  const shift = BigInt(128 - bits);
  return (address >> shift) === (ipv6Number(network) >> shift);
}

/** Only globally routable unicast targets are eligible for an outbound connection. */
export function isPublicImageLinkAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Number(address);
    return !IPV4_BLOCKS.some(([network, bits]) =>
      Math.floor(value / 2 ** (32 - bits)) === Math.floor(ipv4Number(network) / 2 ** (32 - bits)));
  }
  if (family !== 6 || address.includes("%") || address.includes(".")) return false;
  const value = ipv6Number(address);
  return inIpv6Prefix(value, "2000::", 3) && ![
    ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
    ["2620:4f:8000::", 48],
  ].some(([network, bits]) => inIpv6Prefix(value, network, bits));
}

function invalidLink() {
  return new ReferenceRequestError("IMAGE_LINK_INVALID", "请输入不含账号密码的完整 HTTP 或 HTTPS 图片直链。");
}

function privateTarget() {
  return new ReferenceRequestError("IMAGE_LINK_NOT_PUBLIC", "图片链接须指向公开网络地址，请检查链接或上传文件。");
}

export function publicImageLinkUrl(value) {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) throw invalidLink();
  let url;
  try { url = new URL(value.trim()); }
  catch { throw invalidLink(); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname) throw invalidLink();
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (hostname === "localhost" || /\.(?:localhost|local|internal)$/.test(hostname)) throw privateTarget();
  if (isIP(hostname) && !isPublicImageLinkAddress(hostname)) throw privateTarget();
  url.hash = "";
  return url;
}

function headerValue(headers, name) {
  const value = typeof headers?.get === "function" ? headers.get(name) : headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

/** Both framework Request bodies and native request streams have the same actual byte cap. */
export async function readImageLinkRequest(request) {
  if (headerValue(request.headers, "content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ReferenceRequestError("IMAGE_LINK_REQUEST_INVALID", "图片链接请求格式不正确。", 415);
  }
  if (Number(headerValue(request.headers, "content-length")) > MAX_JSON_BYTES) {
    throw new ReferenceRequestError("IMAGE_LINK_REQUEST_TOO_LARGE", "图片链接请求过大。", 413);
  }
  if (request.body === null) throw new ReferenceRequestError("IMAGE_LINK_REQUEST_INVALID", "图片链接请求不能为空。");
  const source = request.body ?? request;
  const chunks = [];
  let size = 0;
  for await (const chunk of source) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_JSON_BYTES) throw new ReferenceRequestError("IMAGE_LINK_REQUEST_TOO_LARGE", "图片链接请求过大。", 413);
    chunks.push(bytes);
  }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ReferenceRequestError("IMAGE_LINK_REQUEST_INVALID", "图片链接请求格式不正确。"); }
  // URL validation is repeated after authorization and at every redirect.
  return { url: publicImageLinkUrl(payload?.url).href };
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function publicTarget(url, lookupImplementation, signal) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(hostname);
  const addresses = family ? [{ address: hostname, family }] : await abortable(
    lookupImplementation(hostname, { all: true, verbatim: true }), signal,
  );
  if (!Array.isArray(addresses) || !addresses.length || addresses.some((entry) =>
    !isPublicImageLinkAddress(entry.address) || entry.family !== isIP(entry.address))) throw privateTarget();
  signal.throwIfAborted();
  return addresses.find((entry) => entry.family === 4) ?? addresses[0];
}

function requestImage(url, target, signal, requestImplementation) {
  return new Promise((resolve, reject) => {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const request = (requestImplementation ?? (url.protocol === "https:" ? httpsRequest : httpRequest))(url, {
      method: "GET", agent: false, autoSelectFamily: false, family: target.family,
      maxHeaderSize: 16 * 1024, rejectUnauthorized: true,
      servername: isIP(hostname) ? "" : hostname,
      headers: { host: url.host, accept: "image/jpeg, image/png", "accept-encoding": "identity" },
      // Native HTTP(S), with no global agent/proxy or second DNS lookup, retains Host and TLS identity.
      lookup(_hostname, options, callback) {
        callback(null, options?.all ? [{ address: target.address, family: target.family }] : target.address, target.family);
      },
    }, (response) => {
      response.once("close", () => signal.removeEventListener("abort", abort));
      resolve(response);
    });
    const abort = () => { request.destroy(signal.reason); reject(signal.reason); };
    request.once("error", (error) => { signal.removeEventListener("abort", abort); reject(error); });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else request.end();
  });
}

function oversizedImage() {
  return new ReferenceRequestError("IMAGE_LINK_TOO_LARGE", "链接图片超过 20 MB，请选择较小的图片。");
}

/**
 * Read one public JPEG/PNG without persistence or forwarding any user credentials.
 * Dependency overrides are only for isolated in-memory tests.
 */
export async function readPublicImageLink(value, {
  signal, lookupImplementation = dnsLookup, requestImplementation,
  inspectImage = inspectReferenceImage, timeoutMs = 20_000,
} = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.throwIfAborted();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Image read timed out", "TimeoutError")), timeoutMs);
  try {
    let url = publicImageLinkUrl(value);
    for (let redirects = 0; ; redirects += 1) {
      controller.signal.throwIfAborted();
      const target = await publicTarget(url, lookupImplementation, controller.signal);
      const response = await requestImage(url, target, controller.signal, requestImplementation);
      try {
        if (REDIRECT_STATUSES.has(response.statusCode)) {
          const location = headerValue(response.headers, "location");
          if (!location || redirects >= MAX_REDIRECTS) {
            throw new ReferenceRequestError("IMAGE_LINK_REDIRECT_INVALID", "图片链接跳转过多或无效，请使用最终图片直链。");
          }
          try { url = publicImageLinkUrl(new URL(location, url).href); }
          catch (error) { if (error instanceof ReferenceRequestError) throw error; throw invalidLink(); }
          continue;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw new ReferenceRequestError("IMAGE_LINK_HTTP_ERROR", `图片链接无法读取（HTTP ${response.statusCode}），请检查链接或上传文件。`);
        }
        const mimeType = headerValue(response.headers, "content-type")?.split(";", 1)[0].trim().toLowerCase();
        if (!REFERENCE_MIME_TYPES.includes(mimeType) || ![undefined, "identity"].includes(headerValue(response.headers, "content-encoding")?.trim().toLowerCase())) {
          throw new ReferenceRequestError("IMAGE_LINK_TYPE_INVALID", "链接须直接返回 JPG 或 PNG 图片，请检查链接或上传文件。");
        }
        if (Number(headerValue(response.headers, "content-length")) > REFERENCE_LIMITS.maxBytes) throw oversizedImage();
        const chunks = [];
        let size = 0;
        for await (const chunk of response) {
          controller.signal.throwIfAborted();
          const bytes = Buffer.from(chunk);
          size += bytes.length;
          if (size > REFERENCE_LIMITS.maxBytes) throw oversizedImage();
          chunks.push(bytes);
        }
        const bytes = Buffer.concat(chunks, size);
        const image = await abortable(inspectImage({ bytes, declaredMimeType: mimeType }), controller.signal);
        controller.signal.throwIfAborted();
        return { bytes, mimeType: image.detectedMimeType };
      } finally { response.destroy(); }
    }
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (controller.signal.aborted) throw new ReferenceRequestError("IMAGE_LINK_TIMEOUT", "读取图片超时，请重试或上传文件。", 408, true);
    if (error instanceof ReferenceRequestError) throw error;
    throw new ReferenceRequestError("IMAGE_LINK_UNAVAILABLE", "暂时无法读取图片链接，请稍后重试或上传文件。", 502, true);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
