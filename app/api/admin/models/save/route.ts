import { modelRoute } from "@/server/admin/model-route.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return modelRoute(request, "save");
}
