import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough, Readable } from "node:stream";
import { isPublicImageLinkAddress, publicImageLinkUrl, readImageLinkRequest, readPublicImageLink } from "../server/references/image-link.mjs";
import { ReferenceRequestError } from "../server/references/errors.mjs";
import { REFERENCE_LIMITS } from "../server/references/constants.mjs";

const imageUrl = "https://images.example.com/photo.png";
const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const publicIpv4 = { address: "93.184.216.34", family: 4 };
const publicIpv6 = { address: "2606:4700:4700::1111", family: 6 };
const fakeInspect = async ({ bytes, declaredMimeType }) => {
  if (!bytes.length) throw new ReferenceRequestError("UPLOAD_EMPTY", "上传的参考图为空。");
  return { detectedMimeType: declaredMimeType };
};
const code = (expected) => (error) => error.code === expected;

function transport(specifications = [{}]) {
  const calls = [];
  const implementation = (url, options, callback) => {
    const specification = specifications[calls.length] ?? specifications.at(-1);
    const call = { url: url.href, options, destroyed: false };
    calls.push(call);
    const request = new EventEmitter();
    let response;
    request.destroy = (error) => {
      call.destroyed = true;
      response?.destroy(error);
      if (error) queueMicrotask(() => request.emit("error", error));
    };
    request.end = () => {
      if (specification.noResponse) return;
      queueMicrotask(() => {
        response = specification.stream ?? Readable.from(specification.chunks ?? [specification.bytes ?? imageBytes]);
        Object.assign(response, {
          statusCode: specification.status ?? 200,
          headers: { "content-type": "image/png", ...specification.headers },
        });
        call.response = response;
        callback(response);
      });
    };
    return request;
  };
  return { calls, implementation };
}

function readWith(specifications, options = {}) {
  const remote = transport(specifications);
  return {
    remote,
    read: (url = imageUrl, overrides = {}) => readPublicImageLink(url, {
      lookupImplementation: async () => [publicIpv4], requestImplementation: remote.implementation,
      inspectImage: fakeInspect, ...options, ...overrides,
    }),
  };
}

test("public unicast classification rejects IPv4 and IPv6 special-use and platform addresses", () => {
  for (const address of ["8.8.8.8", "93.184.216.34", "100.63.255.255", "100.128.0.0", publicIpv6.address, "2001:4860:4860::8888"]) {
    assert.equal(isPublicImageLinkAddress(address), true, address);
  }
  for (const address of [
    "0.0.0.0", "10.1.2.3", "100.64.0.0", "100.127.255.255", "100.100.100.200", "127.0.0.1",
    "169.254.169.254", "168.63.129.16", "172.16.0.1", "172.31.255.255", "192.0.0.9", "192.0.2.1",
    "192.88.99.1", "192.168.1.1", "198.18.0.0", "198.19.255.255", "198.51.100.1", "203.0.113.1",
    "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255", "not-an-ip",
    "::", "::1", "::ffff:8.8.8.8", "::ffff:808:808", "64:ff9b::808:808", "64:ff9b:1::1",
    "fc00::1", "fe80::1", "fe80::1%eth0", "ff02::1", "2001::1", "2001:20::1", "2001:1ff::1",
    "2001:db8::1", "2002:808:808::1", "3fff::1", "3fff:fff::1", "2620:4f:8000::1", "4000::1",
  ]) assert.equal(isPublicImageLinkAddress(address), false, address);
});

test("URL validation blocks credential and IP spelling bypasses before any DNS or transport", async () => {
  const { read, remote } = readWith([{}], { lookupImplementation: async () => { assert.fail("DNS must not run"); } });
  for (const value of ["", "/image.png", "file:///image.png", "ftp://images.example.com/image.png", "https://a:b@images.example.com/image.png", `https://images.example.com/${"a".repeat(4096)}`]) {
    await assert.rejects(read(value), code("IMAGE_LINK_INVALID"));
  }
  for (const value of ["http://127.0.0.1/image.png", "http://2130706433/image.png", "http://0x7f000001/image.png", "https://localhost./image.png", "http://metadata.google.internal/image.png", "http://[::ffff:808:808]/image.png"]) {
    await assert.rejects(read(value), code("IMAGE_LINK_NOT_PUBLIC"));
  }
  assert.equal(remote.calls.length, 0);
  assert.equal(publicImageLinkUrl(`${imageUrl}#fragment`).href, imageUrl);
});

test("JSON request parsing caps declared and actual bytes for native and framework bodies", async () => {
  const json = JSON.stringify({ url: imageUrl });
  const native = Object.assign(Readable.from([json]), { headers: { "content-type": "application/json" } });
  assert.deepEqual(await readImageLinkRequest(native), { url: imageUrl });
  const framework = new Request("https://app.example.com/api/references/read-link", { method: "POST", headers: { "content-type": "application/json" }, body: json });
  assert.deepEqual(await readImageLinkRequest(framework), { url: imageUrl });
  for (const input of [
    Object.assign(Readable.from(["x"]), { headers: { "content-type": "application/json", "content-length": "8193" } }),
    Object.assign(Readable.from([" ".repeat(4096), " ".repeat(4097)]), { headers: { "content-type": "application/json" } }),
    new Request("https://app.example.com/api/references/read-link", { method: "POST", headers: { "content-type": "application/json" }, body: " ".repeat(8193) }),
  ]) await assert.rejects(readImageLinkRequest(input), code("IMAGE_LINK_REQUEST_TOO_LARGE"));
  for (const body of [undefined, "", "{bad", "null"]) {
    const input = new Request("https://app.example.com/api/references/read-link", { method: "POST", headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body }) });
    await assert.rejects(readImageLinkRequest(input), (error) => ["IMAGE_LINK_REQUEST_INVALID", "IMAGE_LINK_INVALID"].includes(error.code) && error.status === 400);
  }
  await assert.rejects(readImageLinkRequest({ headers: { "content-type": "text/plain" } }), code("IMAGE_LINK_REQUEST_INVALID"));
});

test("every DNS answer must be public, including mixed, invalid-family and empty results", async () => {
  for (const answers of [[], [publicIpv4, { address: "127.0.0.1", family: 4 }], [publicIpv6, { address: "fc00::1", family: 6 }], [{ address: "8.8.8.8", family: 6 }]]) {
    const { read, remote } = readWith([{}], { lookupImplementation: async () => answers });
    await assert.rejects(read(), code("IMAGE_LINK_NOT_PUBLIC"));
    assert.equal(remote.calls.length, 0);
  }
});

test("native connections pin an approved IPv4 and preserve Host, TLS and direct-agent settings", async () => {
  const lookups = [];
  const { read, remote } = readWith([{}], { lookupImplementation: async (...input) => { lookups.push(input); return [publicIpv6, publicIpv4]; } });
  const content = await read();
  assert.deepEqual(content, { bytes: imageBytes, mimeType: "image/png" });
  assert.equal(lookups.length, 1);
  assert.deepEqual(lookups[0], ["images.example.com", { all: true, verbatim: true }]);
  const { options } = remote.calls[0];
  assert.equal(options.agent, false);
  assert.equal(options.autoSelectFamily, false);
  assert.equal(options.family, 4);
  assert.equal(options.servername, "images.example.com");
  assert.equal(options.rejectUnauthorized, true);
  assert.deepEqual(options.headers, { host: "images.example.com", accept: "image/jpeg, image/png", "accept-encoding": "identity" });
  options.lookup("images.example.com", {}, (error, address, family) => {
    assert.equal(error, null); assert.equal(address, publicIpv4.address); assert.equal(family, 4);
  });
  options.lookup("images.example.com", { all: true }, (error, addresses) => {
    assert.equal(error, null); assert.deepEqual(addresses, [publicIpv4]);
  });
  assert.equal(lookups.length, 1, "connect does not re-resolve a rebinding hostname");
});

test("public literal IPs bypass DNS while IPv6-only names keep their approved IPv6 connection", async () => {
  const direct = readWith([{}], { lookupImplementation: async () => { assert.fail("Literal IPs need no DNS"); } });
  await direct.read("https://8.8.8.8/p.png");
  assert.equal(direct.remote.calls[0].options.servername, "");
  assert.equal(direct.remote.calls[0].options.headers.host, "8.8.8.8");
  const ipv6 = readWith([{}], { lookupImplementation: async () => [publicIpv6] });
  await ipv6.read();
  assert.equal(ipv6.remote.calls[0].options.family, 6);
});

test("each relative or cross-host redirect is resolved and pinned again without forwarded credentials", async () => {
  const lookups = [];
  const { read, remote } = readWith([
    { status: 302, headers: { location: "/next.png" } },
    { status: 307, headers: { location: "https://cdn.example.com/final.png" } }, {},
  ], { lookupImplementation: async (hostname) => { lookups.push(hostname); return [publicIpv4]; } });
  await read();
  assert.deepEqual(lookups, ["images.example.com", "images.example.com", "cdn.example.com"]);
  assert.deepEqual(remote.calls.map((call) => call.url), [imageUrl, "https://images.example.com/next.png", "https://cdn.example.com/final.png"]);
  for (const call of remote.calls) {
    assert.equal(call.options.method, "GET");
    for (const forbidden of ["cookie", "authorization", "referer"]) assert.equal(call.options.headers[forbidden], undefined);
    assert.equal(call.response.destroyed, true);
  }
  assert.equal(remote.calls[2].options.servername, "cdn.example.com");
});

test("private, credential-bearing and DNS-rebound redirects never open a second connection", async () => {
  for (const location of ["http://169.254.169.254/latest/meta-data", "http://[::1]/image.png", "https://a:b@cdn.example.com/image.png", "file:///etc/passwd"]) {
    const { read, remote } = readWith([{ status: 302, headers: { location } }]);
    await assert.rejects(read(), (error) => ["IMAGE_LINK_INVALID", "IMAGE_LINK_NOT_PUBLIC"].includes(error.code));
    assert.equal(remote.calls.length, 1);
    assert.equal(remote.calls[0].response.destroyed, true);
  }
  let lookupCount = 0;
  const rebound = readWith([{ status: 302, headers: { location: "/next.png" } }], { lookupImplementation: async () => ++lookupCount === 1 ? [publicIpv4] : [{ address: "192.168.1.1", family: 4 }] });
  await assert.rejects(rebound.read(), code("IMAGE_LINK_NOT_PUBLIC"));
  assert.equal(lookupCount, 2);
  assert.equal(rebound.remote.calls.length, 1);
});

test("redirect loops stop at three hops and missing redirect locations fail", async () => {
  const loop = readWith([{ status: 302, headers: { location: "/photo.png" } }]);
  await assert.rejects(loop.read(), code("IMAGE_LINK_REDIRECT_INVALID"));
  assert.equal(loop.remote.calls.length, 4);
  const missing = readWith([{ status: 302 }]);
  await assert.rejects(missing.read(), code("IMAGE_LINK_REDIRECT_INVALID"));
});

test("HTTP, HTML, compressed, empty and oversized responses do not reach successful image inspection", async () => {
  for (const [specification, expected] of [
    [{ status: 403 }, "IMAGE_LINK_HTTP_ERROR"],
    [{ headers: { "content-type": "text/html" } }, "IMAGE_LINK_TYPE_INVALID"],
    [{ headers: { "content-encoding": "gzip" } }, "IMAGE_LINK_TYPE_INVALID"],
    [{ bytes: Buffer.alloc(0) }, "UPLOAD_EMPTY"],
    [{ headers: { "content-length": String(REFERENCE_LIMITS.maxBytes + 1) } }, "IMAGE_LINK_TOO_LARGE"],
    [{ chunks: [Buffer.alloc(REFERENCE_LIMITS.maxBytes), Buffer.alloc(1)] }, "IMAGE_LINK_TOO_LARGE"],
  ]) {
    const { read, remote } = readWith([specification]);
    await assert.rejects(read(), code(expected));
    assert.equal(remote.calls[0].response.destroyed, true);
  }
});

test("cancellation before lookup, during DNS and during waiting response streaming terminates the read", async () => {
  const pre = new AbortController();
  pre.abort();
  const first = readWith([{}], { signal: pre.signal, lookupImplementation: async () => { assert.fail("Cancelled input must not resolve"); } });
  await assert.rejects(first.read(), { name: "AbortError" });
  assert.equal(first.remote.calls.length, 0);
  const dns = new AbortController();
  const second = readWith([{}], { signal: dns.signal, lookupImplementation: async () => { dns.abort(); return new Promise(() => {}); } });
  await assert.rejects(second.read(), { name: "AbortError" });
  assert.equal(second.remote.calls.length, 0);
  const streaming = new AbortController();
  const stream = new PassThrough();
  const third = readWith([{ stream }], { signal: streaming.signal });
  const pending = third.read();
  await new Promise((resolve) => setImmediate(resolve));
  streaming.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(third.remote.calls[0].destroyed, true);
  assert.equal(stream.destroyed, true);
});

test("overall timeout bounds stalled DNS, response headers, streaming and decode, with retry available", async () => {
  const dns = readWith([{}], { timeoutMs: 5, lookupImplementation: async () => new Promise(() => {}) });
  await assert.rejects(dns.read(), code("IMAGE_LINK_TIMEOUT"));
  assert.equal(dns.remote.calls.length, 0);
  const headers = readWith([{ noResponse: true }], { timeoutMs: 5 });
  await assert.rejects(headers.read(), code("IMAGE_LINK_TIMEOUT"));
  assert.equal(headers.remote.calls[0].destroyed, true);
  const stream = new PassThrough();
  const streaming = readWith([{ stream }], { timeoutMs: 5 });
  await assert.rejects(streaming.read(), code("IMAGE_LINK_TIMEOUT"));
  assert.equal(stream.destroyed, true);
  assert.equal(streaming.remote.calls[0].destroyed, true);
  const decode = readWith([{}], { timeoutMs: 5, inspectImage: async () => new Promise(() => {}) });
  await assert.rejects(decode.read(), code("IMAGE_LINK_TIMEOUT"));
  const retry = readWith([{}]);
  assert.equal((await retry.read()).mimeType, "image/png");
});

test("real decoder accepts valid JPEG/PNG and rejects forged, corrupt and undersized images", async () => {
  const sharp = (await import("sharp")).default;
  const image = sharp({ create: { width: 64, height: 64, channels: 3, background: "#ffffff" } });
  const png = await image.clone().png().toBuffer();
  const jpeg = await image.clone().jpeg().toBuffer();
  for (const [bytes, mimeType] of [[png, "image/png"], [jpeg, "image/jpeg"]]) {
    const { read } = readWith([{ bytes, headers: { "content-type": mimeType } }], { inspectImage: undefined });
    assert.equal((await read()).mimeType, mimeType);
  }
  const tiny = await sharp({ create: { width: 1, height: 64, channels: 3, background: "#ffffff" } }).png().toBuffer();
  for (const [bytes, mimeType, expected] of [[jpeg, "image/png", "UPLOAD_TYPE_MISMATCH"], [imageBytes, "image/png", "UPLOAD_DECODE_INVALID"], [tiny, "image/png", "UPLOAD_DIMENSIONS_INVALID"], [Buffer.alloc(0), "image/png", "UPLOAD_EMPTY"]]) {
    const { read } = readWith([{ bytes, headers: { "content-type": mimeType } }], { inspectImage: undefined });
    await assert.rejects(read(), code(expected));
  }
});

test("owner and workspace authorization both finish before the read-only remote operation", async () => {
  const { readReferenceImageLink } = await import("../server/references/api.mjs");
  const calls = [];
  const dependencies = {
    getResources: async () => { calls.push("resources"); return { pool: "fake-pool" }; },
    resolveAccess: async (pool, input) => { calls.push("access"); assert.equal(pool, "fake-pool"); assert.deepEqual(input, { ownerId: "owner-a", workspaceId: "workspace-a" }); },
    readImageLink: async (url, input) => { calls.push("read"); assert.equal(url, imageUrl); assert.equal(input.signal, undefined); return { bytes: imageBytes, mimeType: "image/png" }; },
  };
  await assert.rejects(readReferenceImageLink({ ownerContext: null, url: imageUrl }, dependencies), code("SESSION_EXPIRED"));
  assert.deepEqual(calls, []);
  const denied = { ...dependencies, resolveAccess: async () => { calls.push("denied"); throw new Error("workspace denied"); } };
  await assert.rejects(readReferenceImageLink({ ownerContext: { ownerId: "owner-a" }, url: imageUrl }, denied), /workspace denied/);
  assert.deepEqual(calls, ["resources", "denied"]);
  calls.length = 0;
  const content = await readReferenceImageLink({ ownerContext: { ownerId: "owner-a" }, workspaceId: "workspace-a", url: imageUrl }, dependencies);
  assert.deepEqual(calls, ["resources", "access", "read"]);
  assert.deepEqual(content, { bytes: imageBytes, mimeType: "image/png" });
});

function nodeRequest(body = { url: imageUrl }) {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    url: "/api/references/read-link", method: "POST", headers: { "content-type": "application/json" },
  });
}

function nodeResponse() {
  return Object.assign(new EventEmitter(), {
    writableFinished: false, statusCode: 0, headers: {},
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(body) { this.body = body; this.writableFinished = true; },
  });
}

test("HTTP read route authenticates, preserves workspace, returns private bytes and tolerates normal request close", async () => {
  const { createReferenceNodeApiHandler } = await import("../server/references/node-api.mjs");
  const request = nodeRequest();
  request.headers["x-goodgood-workspace-id"] = "10000000-0000-4000-8000-000000000001";
  const response = nodeResponse();
  const handler = createReferenceNodeApiHandler({
    authenticate: async () => ({ ownerId: "owner-a" }),
    operations: { readReferenceImageLink: async (input) => {
      assert.equal(input.ownerContext.ownerId, "owner-a");
      assert.equal(input.workspaceId, request.headers["x-goodgood-workspace-id"]);
      assert.equal(input.url, imageUrl);
      request.emit("close");
      assert.equal(input.signal.aborted, false);
      return { bytes: imageBytes, mimeType: "image/png" };
    } },
  });
  assert.equal(await handler(request, response), true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, imageBytes);
  assert.equal(response.headers["cache-control"], "private, no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["content-length"], String(imageBytes.length));
  assert.equal(request.listenerCount("aborted"), 0);
  assert.equal(response.listenerCount("close"), 0);
});

test("HTTP unauthenticated, suspended and malformed-body requests never reach the remote operation", async () => {
  const { createReferenceNodeApiHandler } = await import("../server/references/node-api.mjs");
  const { AuthenticationError, sessionExpiredError } = await import("../server/auth/errors.mjs");
  for (const [failure, expectedStatus] of [[sessionExpiredError(), 401], [new AuthenticationError("ACCOUNT_SUSPENDED", "账号已暂停。", 403), 403]]) {
    const handler = createReferenceNodeApiHandler({ authenticate: async () => { throw failure; }, operations: { readReferenceImageLink: async () => { assert.fail("Unauthorized remote operation"); } } });
    const response = nodeResponse();
    await handler(nodeRequest(), response);
    assert.equal(response.statusCode, expectedStatus);
  }
  const handler = createReferenceNodeApiHandler({ authenticate: async () => ({ ownerId: "owner-a" }), operations: { readReferenceImageLink: async () => { assert.fail("Malformed remote operation"); } } });
  const response = nodeResponse();
  await handler(nodeRequest({ url: imageUrl, excess: "x".repeat(8193) }), response);
  assert.equal(response.statusCode, 413);
});

test("HTTP request abort or premature response close cancels the remote operation and removes listeners", async () => {
  const { createReferenceNodeApiHandler } = await import("../server/references/node-api.mjs");
  for (const cancelledSide of ["request", "response"]) {
    const request = nodeRequest();
    const response = nodeResponse();
    let receivedSignal;
    const handler = createReferenceNodeApiHandler({
      authenticate: async () => ({ ownerId: "owner-a" }),
      operations: { readReferenceImageLink: async ({ signal }) => {
        receivedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          queueMicrotask(() => cancelledSide === "request" ? request.emit("aborted") : response.emit("close"));
        });
      } },
    });
    assert.equal(await handler(request, response), true);
    assert.equal(receivedSignal.aborted, true);
    assert.equal(response.statusCode, 0);
    assert.equal(request.listenerCount("aborted"), 0);
    assert.equal(response.listenerCount("close"), 0);
  }
});
