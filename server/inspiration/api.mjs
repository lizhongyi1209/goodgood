import {quotePreset} from './private-parameters.mjs';
import {randomUUID} from 'node:crypto';
import {AuthenticationError,sessionExpiredError} from '../auth/errors.mjs';
import {OrganizationError} from '../organizations/errors.mjs';
import {resolveWorkspaceAccess} from '../organizations/workspace-access.mjs';
import {lockReferenceLifecycle} from '../references/lifecycle-lock.mjs';
import {getGenerationResources} from '../generation/resources.mjs';
import {signAssetRead} from '../generation/storage.mjs';
import {newRequestId} from '../observability/http.mjs';
import {inspirationParameters,inspirationRecipe} from '../../shared/contracts/inspiration.mjs';

export class InspirationError extends Error {
  constructor(code,message,status=400) {super(message);this.code=code;this.status=status;}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function identifier(value) {
  if(typeof value!=='string'||!UUID.test(value)) throw new InspirationError('INSPIRATION_INVALID','案例或作品标识无效。');
  return value;
}
function text(value,max,required=false) {
  if(typeof value!=='string'||Array.from(value.trim()).length>max||(required&&!value.trim())||/[\p{Cc}\p{Cf}]/u.test(value.replace(/[\n\r\t]/g,''))) throw new InspirationError('INSPIRATION_INVALID','请检查案例标题和说明。');
  return value.trim();
}
export function validateInspirationInput(action,input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new InspirationError('INSPIRATION_INVALID','案例请求内容无效。');
  const allowed={list:['query','cursor'],prepare:['assetId'],publish:['assetId','beforeReferenceId','title','description','consent','prompt','promptVisibility','parameterVisibility','comparisonMode'],detail:[],view:['interactionId'],use:['interactionId'],quote:[],like:['liked'],withdraw:[]}[action];
  if(!allowed||Object.keys(input).some(key=>!allowed.includes(key))) throw new InspirationError('INSPIRATION_INVALID','案例请求内容无效。');
  if(action==='prepare') return {assetId:identifier(input.assetId)};
  if(action==='publish') {
    if(input.consent!==true) throw new InspirationError('INSPIRATION_CONSENT_REQUIRED','请确认分享范围后发布。');
    const parameterVisibility=input.parameterVisibility??(input.promptVisibility==='hidden'?'prompt_hidden':'public');
    const promptVisibility=parameterVisibility==='public'?'public':'hidden',comparisonMode=input.comparisonMode??'side_by_side';
    if(!['public','prompt_hidden','hidden'].includes(parameterVisibility)||(input.promptVisibility!==undefined&&input.promptVisibility!==promptVisibility)||!['side_by_side','hover'].includes(comparisonMode)) throw new InspirationError('INSPIRATION_INVALID','请选择提示词和对比展示方式。');
    return {assetId:identifier(input.assetId),beforeReferenceId:input.beforeReferenceId==null?null:identifier(input.beforeReferenceId),title:text(input.title,60,true),description:text(input.description??'',1000),prompt:input.prompt===undefined?undefined:text(input.prompt,4000,true),...(input.parameterVisibility===undefined?{}:{parameterVisibility}),promptVisibility,comparisonMode};
  }
  if(action==='view'||action==='use') return {interactionId:input.interactionId===undefined?null:identifier(input.interactionId)};
  if(action==='like') {if(typeof input.liked!=='boolean') throw new InspirationError('INSPIRATION_INVALID','点赞请求无效。');return {liked:input.liked};}
  if(action==='list') {
    const query=text(input.query??'',100);let cursor=null;
    if(input.cursor!=null) {
      try {
        if(typeof input.cursor!=='string'||input.cursor.length>300) throw new Error();
        const parsed=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));
        identifier(parsed.id);if(typeof parsed.createdAt!=='string'||!Number.isFinite(Date.parse(parsed.createdAt))) throw new Error();
        cursor={id:parsed.id,createdAt:parsed.createdAt};
      } catch {throw new InspirationError('INSPIRATION_INVALID','分页标识已失效，请重新读取。');}
    }
    return {query,cursor};
  }
  return {};
}

const SOURCE_SELECT=`SELECT a.id AS asset_id,a.object_key,a.pixel_width,a.pixel_height,b.*
 FROM assets a JOIN generation_jobs j ON j.id=a.job_id JOIN generation_batches b ON b.id=a.batch_id
 JOIN workspaces w ON w.id=a.workspace_id
 WHERE a.id=$1 AND a.owner_id=$2 AND j.owner_id=$2 AND b.owner_id=$2
 AND w.kind='personal' AND w.personal_owner_id=$2 AND w.status='active'
 AND j.workspace_id=w.id AND b.workspace_id=w.id
 AND j.state='succeeded' AND a.moderation_state='accepted'
 AND NOT EXISTS(SELECT 1 FROM inspiration_generation_prompts gp WHERE gp.job_id=j.id)`;
const CASE_SELECT=`SELECT c.*,to_char(c.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at,
 a.object_key AS after_key,a.pixel_width AS after_width,a.pixel_height AS after_height,
 ra.object_key AS before_key,ra.pixel_width AS before_width,ra.pixel_height AS before_height,
 av.object_key AS avatar_key,
 (SELECT count(*) FROM inspiration_likes l WHERE l.case_id=c.id)::text AS like_count,
 EXISTS(SELECT 1 FROM inspiration_likes l WHERE l.case_id=c.id AND l.owner_id=$1) AS liked
 FROM inspiration_cases c JOIN assets a ON a.id=c.source_asset_id
 JOIN generation_jobs j ON j.id=a.job_id
 JOIN workspaces w ON w.id=a.workspace_id
 LEFT JOIN reference_assets ra ON ra.id=c.before_reference_id AND ra.upload_state='ready' AND ra.moderation_state='accepted' AND ra.object_deleted_at IS NULL
 LEFT JOIN reference_assets av ON av.id::text=c.author_snapshot->>'avatarReferenceId' AND av.upload_state='ready' AND av.moderation_state='accepted' AND av.object_deleted_at IS NULL
 WHERE c.deleted_at IS NULL AND a.owner_id=c.owner_id AND j.owner_id=c.owner_id
 AND w.kind='personal' AND w.personal_owner_id=c.owner_id AND w.status='active'
 AND j.state='succeeded' AND a.moderation_state='accepted'`;
async function sign(resources,key) {
  if(!key) return null;
  return resources.signRead ? resources.signRead(key) : signAssetRead({bucket:resources.config.objectStorage.bucket,key,publicStorage:resources.publicStorage});
}
async function presentCase(row,resources,actor) {
  const [after,before,avatar]=await Promise.all([sign(resources,row.after_key),sign(resources,row.before_key),sign(resources,row.avatar_key)]);
  return {
    id:row.id,title:row.title,description:row.description,prompt:row.prompt_visibility==='hidden'?null:row.prompt,parameters:row.parameter_visibility==='hidden'?null:row.parameters,
    parameterVisibility:row.parameter_visibility??(row.prompt_visibility==='hidden'?'prompt_hidden':'public'),
    views:Number(row.view_count??0),uses:Number(row.use_count??0),
    promptVisibility:row.prompt_visibility??'public',comparisonMode:row.comparison_mode??'side_by_side',
    author:{displayName:row.author_snapshot?.displayName??'GoodGood 用户',handle:row.author_snapshot?.handle??null,avatarUrl:avatar},
    after:{url:after,width:row.after_width,height:row.after_height},
    before:before?{url:before,width:row.before_width,height:row.before_height}:null,
    likes:Number(row.like_count??0),liked:Boolean(row.liked),
    canWithdraw:row.owner_id===actor.ownerId||actor.systemRole==='site_owner',
    owned:row.owner_id===actor.ownerId,createdAt:new Date(row.created_at).toISOString(),
  };
}
async function findCase(pool,id,ownerId) {
  return (await pool.query(`${CASE_SELECT} AND c.id=$2`,[ownerId,id])).rows[0]??null;
}
async function source(pool,assetId,ownerId) {
  const row=(await pool.query(SOURCE_SELECT,[assetId,ownerId])).rows[0];
  if(!row) throw new InspirationError('INSPIRATION_SOURCE_UNAVAILABLE','这张个人作品不存在，或不可分享。',404);
  return row;
}
async function beforeOptions(pool,row,ownerId) {
  const ids=(row.reference_snapshot??[]).map(ref=>ref.id).filter(id=>typeof id==='string'&&UUID.test(id));
  if(!ids.length) return [];
  return (await pool.query(`SELECT id,original_file_name,object_key,pixel_width,pixel_height FROM reference_assets
   WHERE id=ANY($1::uuid[]) AND owner_id=$2 AND creator_owner_id=$2 AND workspace_id=$3
   AND upload_state='ready' AND moderation_state='accepted' AND object_deleted_at IS NULL AND cleanup_lease_owner IS NULL
   ORDER BY array_position($1::uuid[],id)`,[ids,ownerId,row.workspace_id])).rows;
}
async function authorSnapshot(pool,ownerId) {
  const row=(await pool.query(`SELECT p.display_name,p.handle,ra.id AS avatar_reference_id,ra.object_key
   FROM personal_profiles p LEFT JOIN reference_assets ra ON ra.id=p.avatar_reference_id
   AND ra.upload_state='ready' AND ra.moderation_state='accepted' AND ra.object_deleted_at IS NULL WHERE p.owner_id=$1`,[ownerId])).rows[0];
  return {displayName:row?.display_name??'GoodGood 用户',handle:row?.handle??null,avatarReferenceId:row?.avatar_reference_id??null,objectKey:row?.object_key??null};
}

export async function inspirationOperation({action='list',id,input={},ownerContext,resources}) {
  if(!ownerContext?.ownerId) throw sessionExpiredError();
  const value=validateInspirationInput(action,input);
  if(['detail','view','use','quote','like','withdraw'].includes(action)) identifier(id);
  resources??=await getGenerationResources();
  await resolveWorkspaceAccess(resources.pool,{ownerId:ownerContext.ownerId});
  const ownerId=ownerContext.ownerId;
  if(action==='list') {
    const rows=(await resources.pool.query(`${CASE_SELECT}
     AND ($2='' OR strpos(lower(c.title||' '||c.description),lower($2))>0)
     AND ($3::timestamptz IS NULL OR (c.created_at,c.id)<($3::timestamptz,$4::uuid))
     ORDER BY c.created_at DESC,c.id DESC LIMIT 21`,[ownerId,value.query,value.cursor?.createdAt??null,value.cursor?.id??null])).rows;
    const visible=rows.slice(0,20),last=visible.at(-1);
    return {items:await Promise.all(visible.map(row=>presentCase(row,resources,ownerContext))),nextCursor:rows.length>20?Buffer.from(JSON.stringify({id:last.id,createdAt:last.cursor_created_at})).toString('base64url'):null};
  }
  if(['detail','view','use','quote'].includes(action)) {
    const row=await findCase(resources.pool,id,ownerId);
    if(!row) throw new InspirationError('INSPIRATION_NOT_FOUND','案例已下架或无法查看。',404);
    if(action==='quote') {
      if(row.parameter_visibility!=='hidden') throw new InspirationError('INSPIRATION_INVALID','该案例不使用固定参数预设。');
      const recipe=inspirationRecipe(row);
      if(!recipe) throw new InspirationError('INSPIRATION_RECIPE_UNAVAILABLE','案例参数已不可用。',409);
      return quotePreset(resources.pool,recipe);
    }
    if(action==='use') {
      const recipe=inspirationRecipe(row);
      if(!recipe) throw new InspirationError('INSPIRATION_RECIPE_UNAVAILABLE','这个案例的模型参数已不可用。',409);
      const quote=row.parameter_visibility==='hidden'?await quotePreset(resources.pool,recipe):null;
      const stats=value.interactionId?await recordInteraction(resources.pool,row.id,ownerId,'use',value.interactionId):{};
      return {recipe:row.parameter_visibility==='hidden'?null:{...recipe,prompt:row.prompt_visibility==='hidden'?'':recipe.prompt},quote,...stats,interactionId:value.interactionId,caseId:row.id,parameterVisibility:row.parameter_visibility??(row.prompt_visibility==='hidden'?'prompt_hidden':'public'),promptVisibility:row.prompt_visibility??'public',referenceCount:row.parameter_visibility==='hidden'?0:row.parameters.referenceCount,title:row.title};
    }
    const dto=await presentCase(row,resources,ownerContext);
    return action==='view'?{...dto,...await recordInteraction(resources.pool,row.id,ownerId,'view',value.interactionId)}:dto;
  }
  if(action==='prepare') {
    const row=await source(resources.pool,value.assetId,ownerId);
    const options=await beforeOptions(resources.pool,row,ownerId);
    const author=await authorSnapshot(resources.pool,ownerId);
    return {assetId:value.assetId,prompt:row.prompt,parameters:inspirationParameters(row),
      after:{url:await sign(resources,row.object_key),width:row.pixel_width,height:row.pixel_height},
      beforeOptions:await Promise.all(options.map(async ref=>({id:ref.id,name:ref.original_file_name,url:await sign(resources,ref.object_key),width:ref.pixel_width,height:ref.pixel_height}))),
      author:{displayName:author.displayName,handle:author.handle,avatarUrl:await sign(resources,author.objectKey)}};
  }
  const client=await resources.pool.connect();
  try {
    await client.query('BEGIN');
    if(action!=='like') await lockReferenceLifecycle(client);
    if(action==='publish') {
      await resolveWorkspaceAccess(client,{ownerId,write:true});
      const row=await source(client,value.assetId,ownerId);
      const removed=await client.query(`SELECT id FROM inspiration_cases WHERE owner_id=$1 AND source_asset_id=$2 AND deleted_at IS NOT NULL AND deleted_by IS DISTINCT FROM owner_id LIMIT 1`,[ownerId,value.assetId]);
      if(removed.rows.length) throw new InspirationError('INSPIRATION_REMOVED','此作品的案例已被站长下架，暂不能再次分享。',403);
      const options=await beforeOptions(client,row,ownerId);
      if(value.beforeReferenceId&&!options.some(ref=>ref.id===value.beforeReferenceId)) throw new InspirationError('INSPIRATION_BEFORE_UNAVAILABLE','对比原图必须来自这次创作的个人参考素材。');
      const existing=(await client.query(`SELECT id FROM inspiration_cases WHERE owner_id=$1 AND source_asset_id=$2 AND deleted_at IS NULL`,[ownerId,value.assetId])).rows[0];
      let caseId=existing?.id;
      if(!caseId) {
        caseId=randomUUID();const author=await authorSnapshot(client,ownerId);delete author.objectKey;
        await client.query(`INSERT INTO inspiration_cases(id,owner_id,source_asset_id,before_reference_id,title,description,prompt,parameters,author_snapshot,prompt_visibility,comparison_mode,parameter_visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12)`,[caseId,ownerId,value.assetId,value.beforeReferenceId,value.title,value.description,value.prompt??row.prompt,JSON.stringify(inspirationParameters(row)),JSON.stringify(author),value.promptVisibility,value.comparisonMode,value.parameterVisibility??(value.promptVisibility==='hidden'?'prompt_hidden':'public')]);
        await client.query(`INSERT INTO inspiration_events(id,case_id,actor_owner_id,action) VALUES($1,$2,$3,'publish')`,[randomUUID(),caseId,ownerId]);
      }
      const dto=await presentCase(await findCase(client,caseId,ownerId),resources,ownerContext);
      await client.query('COMMIT');return {...dto,alreadyPublished:Boolean(existing)};
    }
    const row=await findCase(client,id,ownerId);
    if(!row&&action==='withdraw') {
      const prior=(await client.query('SELECT owner_id,deleted_at FROM inspiration_cases WHERE id=$1',[id])).rows[0];
      if(prior?.deleted_at&&(prior.owner_id===ownerId||ownerContext.systemRole==='site_owner')) {await client.query('COMMIT');return {withdrawn:true};}
    }
    if(!row) throw new InspirationError('INSPIRATION_NOT_FOUND','案例已下架或无法查看。',404);
    const locked=await client.query('SELECT id FROM inspiration_cases WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id]);
    if(!locked.rows.length) throw new InspirationError('INSPIRATION_NOT_FOUND','案例已下架或无法查看。',404);
    if(action==='like') {
      if(value.liked) await client.query('INSERT INTO inspiration_likes(case_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,ownerId]);
      else await client.query('DELETE FROM inspiration_likes WHERE case_id=$1 AND owner_id=$2',[id,ownerId]);
      const likes=Number((await client.query('SELECT count(*)::text AS count FROM inspiration_likes WHERE case_id=$1',[id])).rows[0].count);
      await client.query('COMMIT');return {liked:value.liked,likes};
    }
    if(row.owner_id!==ownerId&&ownerContext.systemRole!=='site_owner') throw new InspirationError('INSPIRATION_FORBIDDEN','只有作者或站长可以下架案例。',403);
    await client.query('UPDATE inspiration_cases SET deleted_at=now(),deleted_by=$2 WHERE id=$1',[id,ownerId]);
    await client.query('INSERT INTO inspiration_events(id,case_id,actor_owner_id,action) VALUES($1,$2,$3,$4)',[randomUUID(),id,ownerId,row.owner_id===ownerId?'withdraw':'owner_remove']);
    await client.query('COMMIT');return {withdrawn:true};
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}

export function inspirationActionRequested(request) {
  return (typeof request.headers?.get==='function'?request.headers.get('x-goodgood-inspiration-action'):request.headers?.['x-goodgood-inspiration-action'])==='1';
}
export function inspirationApiError(error,requestId=newRequestId()) {
  const known=error instanceof InspirationError||error instanceof AuthenticationError||error instanceof OrganizationError;
  return {status:known?error.status:503,body:{error:{code:known?error.code:'INSPIRATION_UNAVAILABLE',message:known?error.message:'灵感板暂时不可用，请重试。',requestId,retryable:!known}}};
}

async function recordInteraction(pool,id,ownerId,action,interactionId) {
  if(!interactionId) throw new InspirationError('INSPIRATION_INVALID','缺少互动标识。');
  const result=await pool.query(`WITH recorded AS (
   INSERT INTO inspiration_interactions(case_id,owner_id,action,interaction_id)
   SELECT id,$2,$3,$4 FROM inspiration_cases WHERE id=$1 AND deleted_at IS NULL
   ON CONFLICT DO NOTHING RETURNING case_id
  ) UPDATE inspiration_cases SET view_count=view_count+CASE WHEN $3='view' THEN (SELECT count(*) FROM recorded) ELSE 0 END,
   use_count=use_count+CASE WHEN $3='use' THEN (SELECT count(*) FROM recorded) ELSE 0 END
   WHERE id=$1 AND deleted_at IS NULL RETURNING view_count,use_count`,[id,ownerId,action,interactionId]);
  if(!result.rows.length) throw new InspirationError('INSPIRATION_NOT_FOUND','案例已下架。',404);
  return {views:Number(result.rows[0].view_count),uses:Number(result.rows[0].use_count)};
}
