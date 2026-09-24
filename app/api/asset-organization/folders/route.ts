import { createAssetFolder } from "@/server/assets/organization.mjs";
import { assetOrganizationFailure, assetOrganizationJson, organizationScope } from "../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try { return assetOrganizationJson(await createAssetFolder({ ...await organizationScope(request), input: await request.json() }), 201); }
  catch (error) { return assetOrganizationFailure(error); }
}
