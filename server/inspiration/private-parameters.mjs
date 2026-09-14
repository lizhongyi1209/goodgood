import { inspirationRecipe } from '../../shared/contracts/inspiration.mjs';
import { requireEnabledImageModel } from '../admin/models.mjs';
import { modelQualityPriceContext } from '../../shared/contracts/gpt-quality-pricing.mjs';
import { findActiveGenerationPrice } from '../billing/repository.mjs';
import { GenerationPersistenceError } from '../generation/repository.mjs';

// This recipe stays server-side. Author snapshots are immutable after publication.
export async function readPresetParameters(pool,caseId,{ownerId,idempotencyKey}={}) {
  const row=(await pool.query(`SELECT c.* FROM inspiration_cases c
   JOIN assets a ON a.id=c.source_asset_id JOIN generation_jobs j ON j.id=a.job_id
   JOIN workspaces w ON w.id=a.workspace_id
   WHERE c.id=$1 AND c.deleted_at IS NULL AND c.prompt_visibility='hidden'
   AND a.owner_id=c.owner_id AND j.owner_id=c.owner_id
   AND j.state='succeeded' AND a.moderation_state='accepted'
   AND w.kind='personal' AND w.personal_owner_id=c.owner_id AND w.status='active'`,[caseId])).rows[0];
  if(!row && ownerId && idempotencyKey) {
    const prior=(await pool.query(`SELECT c.* FROM inspiration_generation_prompts gp
     JOIN generation_jobs j ON j.id=gp.job_id JOIN inspiration_cases c ON c.id=gp.case_id
     WHERE gp.case_id=$1 AND j.creator_owner_id=$2 AND j.idempotency_key=$3`,[caseId,ownerId,idempotencyKey])).rows[0];
    if(prior) {
      const recipe=inspirationRecipe(prior);
      if(recipe) return {recipe,hidden:prior.parameter_visibility==='hidden'};
    }
  }
  if(!row) throw new GenerationPersistenceError('INSPIRATION_NOT_FOUND','案例已下架或预设不可用。',404);
  const recipe=inspirationRecipe(row);
  if(!recipe) throw new GenerationPersistenceError('INSPIRATION_RECIPE_UNAVAILABLE','案例参数已不可用。',409);
  return {recipe,hidden:row.parameter_visibility==='hidden'};
}

export function presetGenerationInput(preset,input) {
  if(!preset?.hidden) return input;
  return {...preset.recipe,prompt:input.prompt,references:input.references,expectedPriceVersion:input.expectedPriceVersion};
}

export async function quotePreset(pool,recipe) {
  const model=await requireEnabledImageModel(pool,recipe);
  const price=await findActiveGenerationPrice(pool,{modelId:model.id,resolution:recipe.resolution,count:1,planContext:modelQualityPriceContext(model,recipe.imageLine,recipe.quality)});
  return {creditAmount:price.creditAmount.toString(),priceVersion:price.version};
}
