import { saveAssetOrganization } from "@/server/assets/organization.mjs";
import { assetOrganizationFailure, assetOrganizationJson, organizationScope } from "../../../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ kind: string; assetId: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const { kind, assetId } = await context.params;
    return assetOrganizationJson(await saveAssetOrganization({ ...await organizationScope(request), kind, assetId, input: await request.json() }));
  } catch (error) { return assetOrganizationFailure(error); }
}
