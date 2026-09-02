import { inspectAuthenticationConfiguration } from "@/server/auth/config.mjs";
import { inspectGenerationConfiguration } from "@/server/generation/config.mjs";
import {
  getGenerationResources,
  probeGenerationResources,
} from "@/server/generation/resources.mjs";

const HEALTH_HEADERS = {
  "cache-control": "no-store",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authentication = inspectAuthenticationConfiguration();
  const configuration = inspectGenerationConfiguration();
  if (!authentication.configured || !configuration.configured) {
    return Response.json(
      {
        checks: { configuration: "missing", runtime: "ok" },
        service: "goodgood-web",
        status: "not_ready",
      },
      { headers: HEALTH_HEADERS, status: 503 },
    );
  }

  try {
    const checks = await probeGenerationResources(
      await getGenerationResources(),
    );
    return Response.json(
      {
        checks: { ...checks, runtime: "ok" },
        service: "goodgood-web",
        status: "ready",
      },
      { headers: HEALTH_HEADERS },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "web.readiness_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json(
      {
        checks: { dependencies: "unavailable", runtime: "ok" },
        service: "goodgood-web",
        status: "not_ready",
      },
      { headers: HEALTH_HEADERS, status: 503 },
    );
  }
}
