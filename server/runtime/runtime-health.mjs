import { createServer } from "node:http";

const JSON_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...JSON_HEADERS,
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

export function createRuntimeHealthServer({ host, port, service }) {
  let readiness = "starting";

  const server = createServer((request, response) => {
    if (request.method !== "GET") {
      sendJson(
        response,
        405,
        {
          error: "method_not_allowed",
          service,
        },
        { allow: "GET" },
      );
      return;
    }

    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    if (pathname === "/health/live") {
      sendJson(response, 200, {
        service,
        status: "ok",
      });
      return;
    }

    if (pathname === "/health/ready") {
      const ready = readiness === "ready";
      sendJson(response, ready ? 200 : 503, {
        checks: {
          runtime: ready ? "ok" : readiness,
        },
        service,
        status: ready ? "ready" : "not_ready",
      });
      return;
    }

    sendJson(response, 404, {
      error: "not_found",
      service,
    });
  });

  return {
    address() {
      return server.address();
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
    listen() {
      return new Promise((resolve, reject) => {
        const handleError = (error) => {
          server.off("listening", handleListening);
          reject(error);
        };
        const handleListening = () => {
          server.off("error", handleError);
          resolve(server.address());
        };

        server.once("error", handleError);
        server.once("listening", handleListening);
        server.listen(port, host);
      });
    },
    markNotReady(reason = "stopping") {
      readiness = reason;
    },
    markReady() {
      readiness = "ready";
    },
  };
}
