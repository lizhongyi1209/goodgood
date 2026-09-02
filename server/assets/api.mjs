import { randomUUID } from "node:crypto";
import { AuthenticationError, sessionExpiredError } from "../auth/errors.mjs";
import { presentGenerationJob } from "../generation/presenter.mjs";
import { findOwnerAssetGenerationJobs } from "../generation/repository.mjs";
import { getGenerationResources } from "../generation/resources.mjs";

function ownerIdFromContext(ownerContext) {
  if (!ownerContext?.ownerId) throw sessionExpiredError();
  return ownerContext.ownerId;
}

export async function listAssets({ ownerContext }) {
  const resources = await getGenerationResources();
  const ownerId = ownerIdFromContext(ownerContext);
  const rows = await findOwnerAssetGenerationJobs(resources.pool, { ownerId });
  return {
    batches: await Promise.all(
      rows.map((row) => presentGenerationJob(resources, row)),
    ),
  };
}

export function assetApiError(error) {
  const requestId = `req_${randomUUID()}`;
  if (error instanceof AuthenticationError) {
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
