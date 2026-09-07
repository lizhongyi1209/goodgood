import { ManagementClient } from "authing-node-sdk";
import { externalIdentityTarget } from "./identity-adapter.mjs";

const AUTHING_SUCCESS_STATUS = 200;
const AUTHING_USER_NOT_FOUND_API_CODE = 2004;
const DEFAULT_AUTHING_MANAGEMENT_HOST = "https://api.authing.cn";
const DEFAULT_TIMEOUT_MILLISECONDS = 10_000;

export class AuthingIdentityAdapterError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
    this.name = "AuthingIdentityAdapterError";
  }
}

function adapterError(code) {
  return new AuthingIdentityAdapterError(code);
}

function requireSafeValue(value, name) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${name} must contain 1 to 500 safe characters`);
  }
  return value;
}

function requireExpectedIssuer(value) {
  const issuer = requireSafeValue(value, "expectedIssuer");
  let url;
  try {
    url = new URL(issuer);
  } catch {
    throw new Error("expectedIssuer must be a valid HTTPS URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.toString() !== issuer
  ) {
    throw new Error("expectedIssuer must be an exact canonical HTTPS URL");
  }
  return issuer;
}

function isLoopback(hostname) {
  return (
    hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost"
  );
}

function requireManagementHost(value, allowInsecureLoopback) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("host must be a valid origin URL");
  }
  const secure = url.protocol === "https:";
  const allowedLoopback =
    allowInsecureLoopback === true &&
    url.protocol === "http:" &&
    isLoopback(url.hostname);
  if (
    (!secure && !allowedLoopback) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "host must be an HTTPS origin or an explicitly allowed HTTP loopback origin",
    );
  }
  return url.origin;
}

function requireTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 1_000 || value > 30_000) {
    throw new Error(
      "timeoutMilliseconds must be an integer between 1000 and 30000",
    );
  }
  return value;
}

function requireManagementClient(client) {
  if (
    !client ||
    typeof client.getUser !== "function" ||
    typeof client.updateUser !== "function" ||
    typeof client.deleteUsersBatch !== "function"
  ) {
    throw new Error(
      "managementClient must provide getUser, updateUser, and deleteUsersBatch",
    );
  }
  return client;
}

function responseFromError(error) {
  return error?.response?.data ?? null;
}

function isMissingUserResponse(response) {
  return Number(response?.apiCode) === AUTHING_USER_NOT_FOUND_API_CODE;
}

function successfulResponse(response) {
  return response?.statusCode === AUTHING_SUCCESS_STATUS;
}

async function findAuthingUser(client, subject) {
  let response;
  try {
    response = await client.getUser({
      userId: subject,
      userIdType: "user_id",
    });
  } catch (error) {
    if (isMissingUserResponse(responseFromError(error))) return null;
    throw adapterError("AUTHING_IDENTITY_LOOKUP_FAILED");
  }
  if (isMissingUserResponse(response)) return null;
  if (!successfulResponse(response) || response?.data?.userId !== subject) {
    throw adapterError("AUTHING_IDENTITY_LOOKUP_INVALID");
  }
  return response.data;
}

function targetForIssuer(identity, expectedIssuer) {
  const target = externalIdentityTarget(identity);
  if (target.issuer !== expectedIssuer) {
    throw adapterError("AUTHING_IDENTITY_ISSUER_MISMATCH");
  }
  return target;
}

export function createAuthingIdentityDeletionAdapter({
  accessKeyId,
  accessKeySecret,
  allowInsecureLoopback = false,
  expectedIssuer,
  host = DEFAULT_AUTHING_MANAGEMENT_HOST,
  managementClient = null,
  managementClientFactory = (options) => new ManagementClient(options),
  timeoutMilliseconds = DEFAULT_TIMEOUT_MILLISECONDS,
} = {}) {
  const issuer = requireExpectedIssuer(expectedIssuer);
  const managementHost = requireManagementHost(host, allowInsecureLoopback);
  const timeout = requireTimeout(timeoutMilliseconds);

  let client = managementClient;
  if (!client) {
    if (typeof managementClientFactory !== "function") {
      throw new Error("managementClientFactory must be a function");
    }
    const keyId = requireSafeValue(accessKeyId, "accessKeyId");
    const keySecret = requireSafeValue(accessKeySecret, "accessKeySecret");
    client = managementClientFactory({
      accessKeyId: keyId,
      accessKeySecret: keySecret,
      host: managementHost,
      lang: "en-US",
      rejectUnauthorized: true,
      retryTimes: 0,
      timeout,
    });
  }
  requireManagementClient(client);

  return Object.freeze({
    async deleteIdentity(identity) {
      const target = targetForIssuer(identity, issuer);
      const existing = await findAuthingUser(client, target.subject);
      if (!existing) return;

      let response;
      try {
        response = await client.deleteUsersBatch({
          options: { userIdType: "user_id" },
          userIds: [target.subject],
        });
      } catch {
        throw adapterError("AUTHING_IDENTITY_DELETE_FAILED");
      }
      if (!successfulResponse(response) || response?.data?.success !== true) {
        throw adapterError("AUTHING_IDENTITY_DELETE_FAILED");
      }
    },

    async disableIdentity(identity) {
      const target = targetForIssuer(identity, issuer);
      const existing = await findAuthingUser(client, target.subject);
      if (!existing || existing.status === "Suspended") return;

      let response;
      try {
        response = await client.updateUser({
          options: { userIdType: "user_id" },
          status: "Suspended",
          userId: target.subject,
        });
      } catch {
        throw adapterError("AUTHING_IDENTITY_DISABLE_FAILED");
      }
      if (
        !successfulResponse(response) ||
        response?.data?.userId !== target.subject ||
        response?.data?.status !== "Suspended"
      ) {
        throw adapterError("AUTHING_IDENTITY_DISABLE_FAILED");
      }
    },
  });
}
