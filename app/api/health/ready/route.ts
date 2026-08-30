const HEALTH_HEADERS = {
  "cache-control": "no-store",
};

export function GET() {
  return Response.json(
    {
      checks: {
        runtime: "ok",
      },
      service: "goodgood-web",
      status: "ready",
    },
    { headers: HEALTH_HEADERS },
  );
}
