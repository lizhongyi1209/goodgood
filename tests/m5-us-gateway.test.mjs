import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { NormalizedProviderError } from "../server/generation/provider.mjs";
import {
  US_GATEWAY_MVP_ROUTE,
  createUsGatewayAdapter,
  normalizeUsGatewayTask,
  reconcileUsGatewayTask,
} from "../server/generation/us-gateway-adapter.mjs";

const API_KEY = "m5-fake-o1key-api-key";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function createFakeGateway() {
  const submissions = [];
  const uploads = [];
  const tasks = new Map();
  let nextTask = 1;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (request.headers.authorization !== `Bearer ${API_KEY}`) {
      sendJson(response, 401, { error: { message: "unauthorized" } });
      return;
    }
    if (request.method === "POST" && url.pathname === "/v1/o1key/uploads") {
      const body = await readBody(request);
      const contentType = String(request.headers["content-type"] ?? "");
      if (!contentType.startsWith("multipart/form-data; boundary=") || !body.length) {
        sendJson(response, 400, { error: { message: "invalid multipart" } });
        return;
      }
      const uploadNumber = uploads.length + 1;
      uploads.push({ body, contentType });
      sendJson(response, 200, {
        content_type: "image/png",
        expires_at: 1_900_000_000,
        filename: `reference-${uploadNumber}.png`,
        size: 68,
        url: `https://temporary.o1key.invalid/reference-${uploadNumber}.png`,
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/async/v1/generateImage") {
      const body = JSON.parse((await readBody(request)).toString("utf8"));
      const taskId = `task_${nextTask}`;
      nextTask += 1;
      let responses;
      if (/reject/i.test(body.prompt)) {
        responses = [
          { progress: "20%", status: "IN_PROGRESS", task_id: taskId },
          {
            error: "upstream safety policy rejected",
            progress: "100%",
            status: "FAILURE",
            task_id: taskId,
          },
        ];
      } else if (/timeout/i.test(body.prompt)) {
        responses = [{ progress: "20%", status: "IN_PROGRESS", task_id: taskId }];
      } else {
        responses = [
          { status: "SUBMITTED", task_id: taskId },
          { progress: "70%", status: "IN_PROGRESS", task_id: taskId },
          {
            data: {
              images: [
                {
                  mime_type: "image/png",
                  url: "https://assetcache.o1key.invalid/result.png",
                },
              ],
              model: US_GATEWAY_MVP_ROUTE.providerModel,
            },
            progress: "100%",
            status: "SUCCESS",
            task_id: taskId,
          },
        ];
      }
      submissions.push({ body, headers: request.headers, taskId });
      tasks.set(taskId, { polls: 0, responses });
      sendJson(response, 200, { status: "SUBMITTED", task_id: taskId });
      return;
    }

    const match = /^\/async\/v1\/tasks\/([^/]+)$/.exec(url.pathname);
    if (request.method === "GET" && match) {
      const task = tasks.get(decodeURIComponent(match[1]));
      if (!task) {
        sendJson(response, 404, { error: { message: "task not found" } });
        return;
      }
      const index = Math.min(task.polls, task.responses.length - 1);
      task.polls += 1;
      sendJson(response, 200, task.responses[index]);
      return;
    }
    sendJson(response, 404, { error: { message: "not found" } });
  });

  return {
    address: () => server.address(),
    close: () => new Promise((resolve) => server.close(resolve)),
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          server.off("error", reject);
          resolve();
        });
      }),
    submissions,
    uploads,
  };
}

function gatewayAdapter(origin, overrides = {}) {
  return createUsGatewayAdapter({
    allowInsecureLoopback: true,
    apiKey: API_KEY,
    baseUrl: origin,
    ...overrides,
  });
}

function generationRequest(prompt = "a silver future garment") {
  return {
    job: {
      aspect_ratio: "1:1",
      id: "job-1",
      model_id: "nano-banana-2",
      prompt,
      requested_count: 1,
      resolution: "1K",
    },
    references: [],
  };
}

async function withGateway(context) {
  const gateway = createFakeGateway();
  await gateway.listen();
  context.after(() => gateway.close());
  const address = gateway.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  return { adapter: gatewayAdapter(origin), gateway, origin };
}

test("O1Key MVP submission fixes Nano Banana 2 to special-price 1:1 1K", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  const submitted = await adapter.submit(generationRequest());

  assert.deepEqual(submitted, { taskId: "task_1" });
  assert.equal(gateway.submissions.length, 1);
  assert.deepEqual(gateway.submissions[0].body, {
    aspect_ratio: "1:1",
    images: [],
    model: "gemini-3.1-flash-image-c-sp",
    prompt: "a silver future garment",
    response_modalities: ["IMAGE"],
    size: "1K",
  });
  assert.equal(gateway.submissions[0].headers["idempotency-key"], undefined);
  assert.equal(gateway.submissions[0].body.callback_url, undefined);
});

test("validated references use O1Key temporary upload in stable order", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  const request = generationRequest();
  request.references = [
    { bytes: Buffer.from("reference-one"), mimeType: "image/png", name: "one.png" },
    { bytes: Buffer.from("reference-two"), mimeType: "image/png", name: "two.png" },
  ];
  let submissionStartCount = 0;
  await adapter.submit({
    ...request,
    onSubmissionStart: async () => {
      submissionStartCount += 1;
      assert.equal(gateway.uploads.length, 2);
      assert.equal(gateway.submissions.length, 0);
    },
  });

  assert.equal(submissionStartCount, 1);
  assert.equal(gateway.uploads.length, 2);
  assert.deepEqual(gateway.submissions[0].body.images, [
    {
      fileData: {
        fileUri: "https://temporary.o1key.invalid/reference-1.png",
        mimeType: "image/png",
      },
    },
    {
      fileData: {
        fileUri: "https://temporary.o1key.invalid/reference-2.png",
        mimeType: "image/png",
      },
    },
  ]);
});

test("ambiguous O1Key submission fails without an automatic second POST", async () => {
  let generationPosts = 0;
  let submissionStarts = 0;
  const adapter = createUsGatewayAdapter({
    allowInsecureLoopback: true,
    apiKey: API_KEY,
    baseUrl: "http://127.0.0.1:1",
    fetchImplementation: async (_url, options) => {
      if (options.method === "POST") generationPosts += 1;
      throw new Error("connection ended after request write");
    },
  });

  await assert.rejects(
    adapter.submit({
      ...generationRequest(),
      onSubmissionStart: async () => {
        submissionStarts += 1;
      },
    }),
    (error) =>
      error instanceof NormalizedProviderError &&
      error.code === "SUBMISSION_UNKNOWN" &&
      error.retryable === true &&
      /再次生成会创建新的计费任务/.test(error.message),
  );
  assert.equal(submissionStarts, 1);
  assert.equal(generationPosts, 1);
});

test("polling normalizes O1Key success without inventing image dimensions", async (context) => {
  const { adapter } = await withGateway(context);
  const submitted = await adapter.submit(generationRequest());
  const updates = [];
  const completed = await adapter.waitForTerminal({
    onUpdate: async (task) => updates.push(task.state),
    pollIntervalMs: 1,
    taskId: submitted.taskId,
    timeoutMs: 100,
  });

  assert.equal(completed.state, "succeeded");
  assert.deepEqual(updates, ["queued", "running", "succeeded"]);
  assert.deepEqual(completed.outputs[0], {
    id: "output-1",
    mimeType: "image/png",
    url: "https://assetcache.o1key.invalid/result.png",
  });
});

test("O1Key failure strings normalize without reaching the browser", async (context) => {
  const { adapter } = await withGateway(context);
  const submitted = await adapter.submit(generationRequest("reject this"));
  const failed = await adapter.waitForTerminal({
    pollIntervalMs: 1,
    taskId: submitted.taskId,
    timeoutMs: 100,
  });

  assert.equal(failed.failures[0].code, "MODEL_REJECTED");
  assert.doesNotMatch(failed.failures[0].message, /upstream|safety/i);
  assert.throws(
    () =>
      normalizeUsGatewayTask({
        data: { images: {} },
        status: "SUCCESS",
        task_id: "bad",
      }),
    (error) => error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
  );
});

test("bounded O1Key polling normalizes timeout", async (context) => {
  let nowMs = 1_000_000;
  const { origin } = await withGateway(context);
  const adapter = gatewayAdapter(origin, {
    now: () => nowMs,
    sleep: async (milliseconds) => {
      nowMs += milliseconds;
    },
  });
  const submitted = await adapter.submit(generationRequest("timeout forever"));

  await assert.rejects(
    adapter.waitForTerminal({ pollIntervalMs: 10, taskId: submitted.taskId, timeoutMs: 25 }),
    (error) => error instanceof NormalizedProviderError && error.code === "MODEL_TIMEOUT",
  );
});

test("a fresh adapter resumes an existing O1Key task after restart", async (context) => {
  const { adapter, origin } = await withGateway(context);
  const submitted = await adapter.submit(generationRequest());
  const restarted = gatewayAdapter(origin);
  const completed = await restarted.waitForTerminal({
    pollIntervalMs: 1,
    taskId: submitted.taskId,
    timeoutMs: 100,
  });
  assert.equal(completed.state, "succeeded");
});

test("repeated terminal polls are duplicates and conflicting terminal state fails closed", () => {
  const succeeded = normalizeUsGatewayTask({
    data: {
      images: [{ mime_type: "image/png", url: "https://assets.example/result.png" }],
    },
    progress: "100%",
    status: "SUCCESS",
    task_id: "task-terminal",
  });
  assert.equal(reconcileUsGatewayTask(succeeded, succeeded).duplicate, true);
  const failed = normalizeUsGatewayTask({
    error: "upstream image generation failed",
    status: "FAILURE",
    task_id: "task-terminal",
  });
  assert.throws(
    () => reconcileUsGatewayTask(succeeded, failed),
    (error) => error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
  );
});

test("gateway transport and unsupported durable parameters fail closed", async (context) => {
  assert.throws(
    () => createUsGatewayAdapter({ apiKey: API_KEY, baseUrl: "http://gateway.example" }),
    /must use HTTPS/,
  );
  const { adapter } = await withGateway(context);
  await assert.rejects(
    adapter.submit({
      ...generationRequest(),
      job: { ...generationRequest().job, resolution: "2K" },
    }),
    (error) => error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
  );
});
