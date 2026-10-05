import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { VideoGenerationError } from "./errors.mjs";
export function isPublicVideoAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a > 0 && a !== 10 && a !== 127 && a < 224 && !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0 || b === 2)) && !(a === 198 && (b === 18 || b === 19 || b === 51)) && !(a === 203 && b === 0);
  }
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(?:db8|0):/i.test(address);
  return false;
}
/** Pin public DNS at every redirect; bound bytes and time before buffering. */
export async function downloadVideo(url, redirects = 0) {
  const fail = () => new VideoGenerationError("VIDEO_SAVE_FAILED", "视频已生成，保存暂未完成，请重试保存。", 503);
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.port && target.port !== "443" || redirects > 3) throw fail();
  const host = target.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicVideoAddress(address))) throw fail();
  return new Promise((resolve, reject) => {
    const request = https.get(target, { lookup: (_host, options, callback) => { const chosen = addresses[0]; callback(null, options.all ? [chosen] : chosen.address, chosen.family); } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) { response.destroy(); clearTimeout(timer); resolve(downloadVideo(new URL(response.headers.location, target), redirects + 1)); return; }
      if (response.statusCode !== 200 || Number(response.headers["content-length"] ?? 0) > 200 * 1024 * 1024) { clearTimeout(timer); response.destroy(); reject(fail()); return; }
      const chunks = []; let size = 0;
      response.on("data", (chunk) => { size += chunk.length; if (size > 200 * 1024 * 1024) response.destroy(fail()); else chunks.push(chunk); });
      response.on("end", () => { clearTimeout(timer); if (!size) reject(fail()); else resolve(Buffer.concat(chunks)); });
      response.on("error", () => { clearTimeout(timer); reject(fail()); });
    });
    const timer = setTimeout(() => request.destroy(fail()), 120_000);
    request.on("error", () => { clearTimeout(timer); reject(fail()); });
  });
}
