let identity = null;

export function setVerifiedLocalBuildIdentity(build) {
  identity = build ? Object.freeze({
    revision: build.revision,
    sourceHash: build.sourceHash,
    artifactHash: build.artifactHash,
    builtAt: build.builtAt,
    verified: true,
  }) : null;
}

export function handleLocalBuildVersion(request, response) {
  if (new URL(request.url, "http://localhost").pathname !== "/api/health/version") return false;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "application/json");
  if (request.method !== "GET") {
    response.setHeader("allow", "GET");
    response.statusCode = 405;
    response.end(JSON.stringify({ error: "method_not_allowed" }));
  } else {
    response.statusCode = 200;
    response.end(JSON.stringify({ service: "goodgood-web", revision: process.env.GOODGOOD_REVISION ?? "development", build: identity, pid: process.pid }));
  }
  return true;
}
