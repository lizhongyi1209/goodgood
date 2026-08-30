const HEALTH_HEADERS = {
  "cache-control": "no-store",
};

export function GET() {
  return Response.json(
    {
      service: "goodgood-web",
      status: "ok",
    },
    { headers: HEALTH_HEADERS },
  );
}
