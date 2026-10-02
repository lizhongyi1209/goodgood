import { createTextAsset, listTextAssets, textAssetApiError } from "@/server/text-assets/api.mjs";
import { AssetRequestError } from "@/server/assets/api.mjs";
import { Buffer } from "node:buffer";
import { organizationScope, assetOrganizationJson } from "../asset-organization/helpers";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function failure(error: unknown) { const value = textAssetApiError(error); return assetOrganizationJson(value.body, value.status); }
export async function GET(request: Request) { try { return assetOrganizationJson(await listTextAssets(await organizationScope(request))); } catch (error) { return failure(error); } }
export async function POST(request: Request) {
  try {
    const scope = await organizationScope(request);
    const body = await request.text();
    if (Buffer.byteLength(body) > 512 * 1024) throw new AssetRequestError("TEXT_ASSET_TOO_LARGE", "文本模板请求过大。", 413);
    let input: unknown;
    try { input = JSON.parse(body); } catch { throw new AssetRequestError("TEXT_ASSET_INVALID", "文本模板请求无效。", 400); }
    return assetOrganizationJson(await createTextAsset({ ...scope, input }), 201);
  } catch (error) { return failure(error); }
}
