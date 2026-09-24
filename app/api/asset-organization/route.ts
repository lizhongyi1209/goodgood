import { listAssetOrganization } from "@/server/assets/organization.mjs";
import { assetOrganizationFailure, assetOrganizationJson, organizationScope } from "./helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try { return assetOrganizationJson(await listAssetOrganization(await organizationScope(request))); }
  catch (error) { return assetOrganizationFailure(error); }
}
