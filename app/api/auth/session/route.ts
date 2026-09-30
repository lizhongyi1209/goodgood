export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "production" && !process.env.GOODGOOD_AUTH_MODE) {
    return Response.json(
      {
        account: {
          availableCredits: "200",
          businessRole: null,
          reservedCredits: "0",
          role: "member",
          tier: "seed",
          unit: "credit-cny-cent",
        },
        access: { status: "active" },
        authenticated: true,
        preview: true,
        user: { email: "preview@goodgood.local", id: "preview-local" },
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
  try {
    const { getAuthenticationRuntime } = await import("@/server/auth/runtime-operations.mjs");
    const { operations } = await getAuthenticationRuntime();
    return Response.json(await operations.readSession(request), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const { authenticationApiError } = await import("@/server/auth/operations.mjs");
    const failure = authenticationApiError(error);
    return Response.json(failure.body, {
      headers: { "cache-control": "no-store" },
      status: failure.status,
    });
  }
}
