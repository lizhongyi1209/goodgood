import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { presentGenerationJob } from "../generation/presenter.mjs";
import {
  findOwnerAsset,
  findOwnerAssetGenerationJobs,
} from "../generation/repository.mjs";
import { getGenerationResources } from "../generation/resources.mjs";
import { signAssetRead } from "../generation/storage.mjs";
import { newRequestId } from "../observability/http.mjs";
import { OrganizationError } from "../organizations/errors.mjs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_WORKSPACE_ID = /** @type {string | null} */ (null);

export class AssetRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AssetRequestError";
    this.code = code;
    this.retryable = false;
    this.status = status;
  }
}

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

export async function listAssets({
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const rows = await findOwnerAssetGenerationJobs(resources.pool, {
    ownerId,
    workspaceId,
  });
  return {
    batches: await Promise.all(
      rows.map((row) => presentGenerationJob(resources, row)),
    ),
  };
}

export async function getAssetDownloadUrl({
  assetId,
  ownerContext,
  workspaceId = DEFAULT_WORKSPACE_ID,
}) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  if (typeof assetId !== "string" || !UUID_PATTERN.test(assetId)) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  const asset = await findOwnerAsset(resources.pool, {
    assetId,
    ownerId,
    workspaceId,
  });
  if (!asset) {
    throw new AssetRequestError("ASSET_NOT_FOUND", "未找到这张图片。", 404);
  }
  return {
    url: await signAssetRead({
      bucket: resources.config.objectStorage.bucket,
      key: asset.object_key,
      publicStorage: resources.publicStorage,
    }),
  };
}

export function assetApiError(error, requestId = newRequestId()) {
  if (
    error instanceof AuthenticationError ||
    error instanceof AssetRequestError ||
    error instanceof OrganizationError
  ) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: false,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "asset.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "ASSET_LIBRARY_UNAVAILABLE",
        message: "资产库暂时无法读取，请重试。",
        requestId,
        retryable: true,
      },
    },
    status: 503,
  };
}
