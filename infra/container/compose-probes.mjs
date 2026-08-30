import { connect } from "node:net";

function probeError(name, message) {
  return new Error(`${name}: ${message}`);
}

export async function probeHttp({
  expectedJsonStatus,
  name,
  timeoutMs = 3_000,
  url,
}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw probeError(
      name,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    throw probeError(name, `${url} returned ${response.status}`);
  }

  if (expectedJsonStatus !== undefined) {
    const body = await response.json();
    if (body.status !== expectedJsonStatus) {
      throw probeError(
        name,
        `${url} reported ${String(body.status)} instead of ${expectedJsonStatus}`,
      );
    }
  }

  return name;
}

export function probeTcp({ host = "127.0.0.1", name, port, timeoutMs = 3_000 }) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(probeError(name, `timed out connecting to ${host}:${port}`));
    }, timeoutMs);

    const fail = (error) => {
      clearTimeout(timer);
      socket.destroy();
      reject(
        probeError(name, error instanceof Error ? error.message : String(error)),
      );
    };

    socket.once("error", fail);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.off("error", fail);
      socket.end();
      resolve(name);
    });
  });
}

export function probeValkey({
  host = "127.0.0.1",
  name,
  port,
  timeoutMs = 3_000,
}) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let response = "";
    let settled = false;

    const finish = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) {
        reject(probeError(name, error));
        return;
      }
      resolve(name);
    };

    const timer = setTimeout(() => {
      finish(`timed out waiting for PONG from ${host}:${port}`);
    }, timeoutMs);

    socket.setEncoding("utf8");
    socket.once("error", (error) => finish(error.message));
    socket.once("connect", () => {
      socket.write("*1\r\n$4\r\nPING\r\n");
    });
    socket.on("data", (chunk) => {
      response += chunk;
      if (!response.includes("\r\n")) {
        return;
      }
      finish(response.startsWith("+PONG\r\n") ? undefined : response.trim());
    });
    socket.once("end", () => {
      if (!settled) {
        finish(`connection ended before PONG: ${response.trim()}`);
      }
    });
  });
}
