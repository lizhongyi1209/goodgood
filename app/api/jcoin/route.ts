export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(
    { error: { code: "FEATURE_REMOVED", message: "平台币功能已移除。" } },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}
