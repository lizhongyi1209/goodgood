import { deleteAssetFolder, renameAssetFolder } from "@/server/assets/organization.mjs";
import { assetOrganizationFailure, assetOrganizationJson, organizationScope } from "../../helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ folderId: string }> };

export async function PATCH(request: Request, context: Context) {
  try { return assetOrganizationJson(await renameAssetFolder({ ...await organizationScope(request), folderId: (await context.params).folderId, input: await request.json() })); }
  catch (error) { return assetOrganizationFailure(error); }
}

export async function DELETE(request: Request, context: Context) {
  try { return assetOrganizationJson(await deleteAssetFolder({ ...await organizationScope(request), folderId: (await context.params).folderId })); }
  catch (error) { return assetOrganizationFailure(error); }
}
