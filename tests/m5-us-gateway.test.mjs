import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { NormalizedProviderError } from "../server/generation/provider.mjs";
import {
  GENERATION_MODEL_CAPABILITIES,
  SUPPORTED_GENERATION_ASPECT_RATIOS,
  SUPPORTED_GENERATION_RESOLUTIONS,
  getGptImage2PixelSize,
} from "../server/generation/capabilities.mjs";
import {
  US_GATEWAY_GPT_IMAGE_2_ROUTE,
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
      const resultImages = Array.from({ length: body.n ?? 1 }, (_, index) => ({
        mime_type: "image/png",
        url: `https://assetcache.o1key.invalid/result-${index + 1}.png`,
      }));
      let responses;
      if (/transient failure/i.test(body.prompt)) {
        responses = [
          { status: "SUBMITTED", task_id: taskId },
          { progress: "70%", status: "IN_PROGRESS", task_id: taskId },
          {
            error: "temporary upstream failure",
            progress: "100%",
            status: "FAILURE",
            task_id: taskId,
          },
          {
            data: {
              images: resultImages,
              model: US_GATEWAY_MVP_ROUTE.providerModel,
            },
            progress: "100%",
            status: "SUCCESS",
            task_id: taskId,
          },
        ];
      } else if (/reject/i.test(body.prompt)) {
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
              images: resultImages,
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

function generationRequest(prompt = "a silver future garment", jobOverrides = {}) {
  return {
    job: {
      aspect_ratio: "1:1",
      id: "job-1",
      model_id: "nano-banana-2",
      prompt,
      requested_count: 1,
      resolution: "1K",
      ...jobOverrides,
    },
    references: [],
  };
}

async function withGateway(context, route = US_GATEWAY_MVP_ROUTE) {
  const gateway = createFakeGateway();
  await gateway.listen();
  context.after(() => gateway.close());
  const address = gateway.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  return { adapter: gatewayAdapter(origin, { route }), gateway, origin };
}

test("O1Key submission forwards every enabled aspect ratio and resolution", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  let submissionIndex = 0;
  for (const aspectRatio of SUPPORTED_GENERATION_ASPECT_RATIOS) {
    for (const resolution of SUPPORTED_GENERATION_RESOLUTIONS) {
      const submitted = await adapter.submit(
        generationRequest("a silver future garment", {
          aspect_ratio: aspectRatio,
          resolution,
        }),
      );
      submissionIndex += 1;
      assert.deepEqual(submitted, { taskId: `task_${submissionIndex}` });
      assert.deepEqual(gateway.submissions.at(-1).body, {
        aspect_ratio: aspectRatio,
        images: [],
        model: "gemini-3.1-flash-image-c-sp",
        prompt: "a silver future garment",
        response_modalities: ["TEXT", "IMAGE"],
        size: resolution,
      });
    }
  }
  assert.equal(gateway.submissions.length, 42);
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
    url: "https://assetcache.o1key.invalid/result-1.png",
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

test("one transient O1Key failure observation does not discard a later success", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  const submitted = await adapter.submit(generationRequest("transient failure then success"));
  const updates = [];
  const completed = await adapter.waitForTerminal({
    onUpdate: async (task) => updates.push(task.state),
    pollIntervalMs: 1,
    taskId: submitted.taskId,
    timeoutMs: 100,
  });

  assert.equal(completed.state, "succeeded");
  assert.deepEqual(updates, ["queued", "running", "succeeded"]);
  assert.equal(gateway.submissions.length, 1);
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
  for (const jobOverrides of [
    { aspect_ratio: "10:1" },
    { model_id: "nano-banana-pro" },
    { requested_count: 3 },
    { resolution: "8K" },
  ]) {
    await assert.rejects(
      adapter.submit(generationRequest("unsupported", jobOverrides)),
      (error) =>
        error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
    );
  }
});

test("Nano Banana 2 forwards only explicitly enabled thinking and Google Search fields", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  await adapter.submit(generationRequest("grounded high-thinking image", {
    thinking_level: "high",
    google_search: true,
  }));
  assert.equal(gateway.submissions.length, 1);
  assert.equal(gateway.submissions[0].body.thinking_level, "high");
  assert.equal(gateway.submissions[0].body.google_search, true);
  assert.deepEqual(
    gateway.submissions[0].body.response_modalities,
    ["TEXT", "IMAGE"],
  );
});

test("Nano Banana 2 accepts multi-output counts without forwarding an unsupported n field", async (context) => {
  const { adapter, gateway } = await withGateway(context);
  await adapter.submit(
    generationRequest("one task in a four-output GoodGood batch", {
      requested_count: 4,
    }),
  );
  assert.equal(gateway.submissions.length, 1);
  assert.equal(gateway.submissions[0].body.n, undefined);
  assert.equal(gateway.submissions[0].body.aspect_ratio, "1:1");
  assert.equal(gateway.submissions[0].body.size, "1K");
});

test("GPT Image 2 SD maps every enabled size and count to one native task", async (context) => {
  const { adapter, gateway } = await withGateway(
    context,
    US_GATEWAY_GPT_IMAGE_2_ROUTE,
  );
  let submissionIndex = 0;
  for (const aspectRatio of GENERATION_MODEL_CAPABILITIES["gpt-image-2"].aspectRatios) {
    for (const resolution of SUPPORTED_GENERATION_RESOLUTIONS) {
      for (const count of [1, 2, 4]) {
        const submitted = await adapter.submit(
          generationRequest("a realistic glass badge", {
            aspect_ratio: aspectRatio,
            model_id: "gpt-image-2",
            requested_count: count,
            resolution,
          }),
        );
        submissionIndex += 1;
        assert.deepEqual(submitted, { taskId: `task_${submissionIndex}` });
        assert.deepEqual(gateway.submissions.at(-1).body, {
          background: "auto",
          images: [],
          model: "gpt-image-2-c-sd",
          n: count,
          output_format: "jpeg",
          prompt: "a realistic glass badge",
          quality: "auto",
          size: getGptImage2PixelSize(aspectRatio, resolution),
        });
      }
    }
  }
  assert.equal(gateway.submissions.length, 63);
  assert.equal(gateway.submissions[0].body.aspect_ratio, undefined);
  assert.equal(gateway.submissions[0].body.response_modalities, undefined);
  assert.match(gateway.submissions[0].body.size, /^\d+x\d+$/);
});

test("GPT Image 2 forwards quality, transparent background, and WebP at the top level", async (context) => {
  const { adapter, gateway } = await withGateway(
    context,
    US_GATEWAY_GPT_IMAGE_2_ROUTE,
  );
  await adapter.submit(generationRequest("transparent glass badge", {
    background: "transparent",
    model_id: "gpt-image-2",
    output_format: "webp",
    quality: "high",
  }));
  assert.equal(gateway.submissions.length, 1);
  assert.equal(gateway.submissions[0].body.quality, "high");
  assert.equal(gateway.submissions[0].body.background, "transparent");
  assert.equal(gateway.submissions[0].body.output_format, "webp");
  assert.equal(gateway.submissions[0].body.thinking_level, undefined);
  assert.equal(gateway.submissions[0].body.google_search, undefined);
});

test("GPT Image 2 rejects transparent JPEG before provider submission", async (context) => {
  const { adapter, gateway } = await withGateway(
    context,
    US_GATEWAY_GPT_IMAGE_2_ROUTE,
  );
  await assert.rejects(
    adapter.submit(generationRequest("invalid transparent JPEG", {
      background: "transparent",
      model_id: "gpt-image-2",
      output_format: "jpeg",
    })),
    (error) => error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
  );
  assert.equal(gateway.submissions.length, 0);
});

test("GPT Image 2 polling returns exactly the requested ordered outputs", async (context) => {
  const { adapter } = await withGateway(context, US_GATEWAY_GPT_IMAGE_2_ROUTE);
  const submitted = await adapter.submit(
    generationRequest("four ordered images", {
      model_id: "gpt-image-2",
      requested_count: 4,
    }),
  );
  const completed = await adapter.waitForTerminal({
    expectedOutputCount: 4,
    pollIntervalMs: 1,
    taskId: submitted.taskId,
    timeoutMs: 100,
  });
  assert.deepEqual(
    completed.outputs.map((output) => output.id),
    ["output-1", "output-2", "output-3", "output-4"],
  );
  assert.throws(
    () => normalizeUsGatewayTask({
      data: { images: completed.outputs.slice(0, 2).map((output) => ({
        mime_type: output.mimeType,
        url: output.url,
      })) },
      status: "SUCCESS",
      task_id: "short-task",
    }, { expectedOutputCount: 4 }),
    (error) => error instanceof NormalizedProviderError && error.code === "INTERNAL_ERROR",
  );
});

test("GPT Image 2 SD keeps validated reference uploads in the edit request", async (context) => {
  const { adapter, gateway } = await withGateway(
    context,
    US_GATEWAY_GPT_IMAGE_2_ROUTE,
  );
  await adapter.submit({
    ...generationRequest("keep the subject and change the material", {
      aspect_ratio: "3:2",
      model_id: "gpt-image-2",
      resolution: "4K",
    }),
    references: [
      {
        bytes: Buffer.from("gpt-reference"),
        mimeType: "image/png",
        name: "subject.png",
      },
    ],
  });

  assert.deepEqual(gateway.submissions[0].body, {
    background: "auto",
    images: [
      {
        fileData: {
          fileUri: "https://temporary.o1key.invalid/reference-1.png",
          mimeType: "image/png",
        },
      },
    ],
    model: "gpt-image-2-c-sd",
    n: 1,
    output_format: "jpeg",
    prompt: "keep the subject and change the material",
    quality: "auto",
    size: "3504x2336",
  });
});
