// Deploy this source to the existing goodgood-asset-read-guard ESA function.
// The encrypted production function variable GOODGOOD_ASSET_READ_SECRET must
// match the GoodGood server secret file. The guard is published; application
// storage changes with the separate GoodGood server release.
import { env } from "alibaba:workers";

const DENIED = () => new ResponseBypass(false, { status: 403 });
const encoder = new TextEncoder();
const READ_HOST = "oss-goodgood.o1key.cn";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function equalHex(left, right) {
  if (left.length !== 64 || right.length !== 64) return false;
  let difference = 0;
  for (let index = 0; index < 64; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

const guard = {
  async bypass(request) {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") return DENIED();
      const url = new URL(request.url);
      if (url.hostname !== READ_HOST || !url.pathname.startsWith("/oss/")) {
        return DENIED();
      }
      if (url.searchParams.getAll("gg_exp").length !== 1 ||
          url.searchParams.getAll("gg_sig").length !== 1 ||
          [...url.searchParams.keys()].some((name) =>
            name !== "gg_exp" && name !== "gg_sig")) {
        return DENIED();
      }
      const expiresText = url.searchParams.get("gg_exp");
      const signature = url.searchParams.get("gg_sig");
      if (!/^\d{10}$/.test(expiresText ?? "") ||
          !/^[0-9a-f]{64}$/.test(signature ?? "")) {
        return DENIED();
      }
      const expires = Number(expiresText);
      const now = Math.floor(Date.now() / 1_000);
      // Allow one minute of clock skew, while GoodGood issues 15-minute URLs.
      if (expires <= now || expires > now + 16 * 60) {
        return DENIED();
      }
      const secret = env.GOODGOOD_ASSET_READ_SECRET;
      if (typeof secret !== "string" || secret.length < 32) {
        return DENIED();
      }
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" },
        false, ["sign"],
      );
      const expected = toHex(await crypto.subtle.sign(
        "HMAC", key, encoder.encode(`${url.pathname}\n${expires}`),
      ));
      const matched = equalHex(signature, expected);
      return matched ? new ResponseBypass(true) : DENIED();
    } catch {
      return DENIED();
    }
  },
};

export default guard;
