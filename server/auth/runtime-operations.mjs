import { getGenerationResources } from "../generation/resources.mjs";
import { loadAuthenticationConfig } from "./config.mjs";
import { createAuthenticationOperations } from "./operations.mjs";
import { createRequestAuthenticator } from "./request-authenticator.mjs";

let operationsPromise;

export function getAuthenticationRuntime() {
  operationsPromise ??= (async () => {
    const config = loadAuthenticationConfig();
    const resources = await getGenerationResources();
    const getPool = async () => resources.pool;
    const authenticate = createRequestAuthenticator({ config, getPool });
    return Object.freeze({
      authenticate,
      config,
      operations: createAuthenticationOperations({
        authenticate,
        config,
        getPool,
      }),
    });
  })().catch((error) => {
    operationsPromise = undefined;
    throw error;
  });
  return operationsPromise;
}
