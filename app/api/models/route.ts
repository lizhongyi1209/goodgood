import { modelRoute } from "@/server/admin/model-route.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return modelRoute(request, "directory");
}
