import { deleteTextAsset, getTextAsset, textAssetApiError } from "@/server/text-assets/api.mjs";
import { organizationScope, assetOrganizationJson } from "../../asset-organization/helpers";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ assetId: string }> };
async function operate(request: Request, context: Context, remove: boolean) {
  try { const { assetId } = await context.params; const scope = { ...await organizationScope(request), assetId };
    return assetOrganizationJson(await (remove ? deleteTextAsset(scope) : getTextAsset(scope)));
  } catch (error) { const failure = textAssetApiError(error); return assetOrganizationJson(failure.body, failure.status); }
}
export function GET(request: Request, context: Context) { return operate(request, context, false); }
export function DELETE(request: Request, context: Context) { return operate(request, context, true); }

