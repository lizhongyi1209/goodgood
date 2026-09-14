import {createHash,randomUUID} from 'node:crypto';
import {PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getGenerationResources,prepareObjectStorage} from '../generation/resources.mjs';
import {AuthenticationError,sessionExpiredError} from '../auth/errors.mjs';
import {inspectReferenceImage} from '../references/validation.mjs';
import {FEEDBACK_CATEGORIES,FEEDBACK_STATUSES,FEEDBACK_LIMITS} from '../../shared/contracts/feedback.mjs';

export class FeedbackError extends Error {
  constructor(code,message,status=400){super(message);this.code=code;this.status=status;}
}
const invalid=message=>new FeedbackError('FEEDBACK_INVALID',message);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const owns=(map,key)=>Object.hasOwn(map,key);
export function validateFeedback(input,files=[]) {
  const category=input?.category,message=typeof input?.message==='string'?input.message.trim():'';
  if(!owns(FEEDBACK_CATEGORIES,category)||!message||Array.from(message).length>FEEDBACK_LIMITS.message||message.includes('\0'))throw invalid('请选择问题类型，并填写1–4000字反馈信息。');
  if(!Array.isArray(files)||files.length>5)throw invalid('最多可提交5张图片。');
  for(const file of files)if(!['image/png','image/jpeg','image/webp'].includes(file?.mimeType)||!Buffer.isBuffer(file.bytes)||file.bytes.length<1||file.bytes.length>FEEDBACK_LIMITS.imageBytes)throw invalid('图片仅支持JPEG、PNG、WebP，单张最多10 MB。');
  return {category,message};
}
export function validateFeedbackAction(input) {
  const message=typeof input?.message==='string'?input.message.trim():'';
  if(!owns(FEEDBACK_STATUSES,input?.status)||!Number.isInteger(input?.version)||input.version<1||input.version>2147483646||Array.from(message).length>4000||message.includes('\0'))throw invalid('回复或状态无效，请检查后重试。');
  return {status:input.status,version:input.version,message};
}
function key(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_:]{8,200}$/.test(value))throw invalid('操作标识无效，请刷新后重试。');return value;}
function id(value){if(!uuid.test(value))throw invalid('反馈标识无效。');return value;}
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function authorize(pool,ownerContext,administrator=false) {
  if(!ownerContext?.ownerId)throw sessionExpiredError();
  const result=await pool.query(`SELECT u.id FROM users u WHERE u.id=$1 ${administrator?"AND u.status='active' AND EXISTS(SELECT 1 FROM system_role_assignments r WHERE r.owner_id=u.id AND r.role='site_owner')":''} FOR SHARE OF u`,[ownerContext.ownerId]);
  if(!result.rowCount)throw new FeedbackError('FEEDBACK_FORBIDDEN','没有问题反馈管理权限。',403);
}
function summary(row,administrator=false){return {id:row.id,category:row.category,message:row.message,status:row.status,version:row.version,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),replyCount:Number(row.reply_count??0),...(administrator?{ownerEmail:row.email}:{} )};}
export function validateFeedbackCursor(cursor) {
  if(!cursor)return null;
  try {if(typeof cursor!=='string'||cursor.length>256)throw Error();const value=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!uuid.test(value.id)||typeof value.at!=='string'||!Number.isFinite(Date.parse(value.at)))throw Error();return value;}catch{throw invalid('反馈分页标识无效，请刷新后重试。');}
}
export async function listFeedback({ownerContext,input={},administrator=false,resources}) {
  resources??=await getGenerationResources();await authorize(resources.pool,ownerContext,administrator);
  const cursor=validateFeedbackCursor(input?.cursor),status=input?.status||null;
  if(status&&!owns(FEEDBACK_STATUSES,status))throw invalid('反馈状态筛选无效。');
  const result=await resources.pool.query(`SELECT t.*,u.email,(SELECT count(*) FROM feedback_events e WHERE e.ticket_id=t.id AND e.message IS NOT NULL) AS reply_count
    FROM feedback_tickets t JOIN users u ON u.id=t.owner_id WHERE ($1::uuid IS NULL OR t.owner_id=$1) AND ($2::text IS NULL OR t.status=$2)
    AND ($3::timestamptz IS NULL OR (t.created_at,t.id)<($3,$4::uuid)) ORDER BY t.created_at DESC,t.id DESC LIMIT 21`,[administrator?null:ownerContext.ownerId,status,cursor?.at??null,cursor?.id??null]);
  const rows=result.rows.slice(0,20),last=rows.at(-1);
  return {items:rows.map(r=>summary(r,administrator)),nextCursor:result.rowCount>20?Buffer.from(JSON.stringify({at:new Date(last.created_at).toISOString(),id:last.id})).toString('base64url'):null};
}
async function ticket(pool,{ownerContext,ticketId,administrator=false,lock=false}) {
  await authorize(pool,ownerContext,administrator);
  const row=(await pool.query(`SELECT t.*,u.email FROM feedback_tickets t JOIN users u ON u.id=t.owner_id WHERE t.id=$1 AND ($2::uuid IS NULL OR t.owner_id=$2) ${lock?'FOR UPDATE OF t':''}`,[id(ticketId),administrator?null:ownerContext.ownerId])).rows[0];
  if(!row)throw new FeedbackError('FEEDBACK_NOT_FOUND','未找到这条反馈。',404);return row;
}
export async function readFeedback({ownerContext,ticketId,administrator=false,resources}) {
  resources??=await getGenerationResources();const row=await ticket(resources.pool,{ownerContext,ticketId,administrator});
  const [images,events]=await Promise.all([resources.pool.query('SELECT position FROM feedback_images WHERE ticket_id=$1 ORDER BY position',[ticketId]),resources.pool.query('SELECT id,message,status,created_at FROM feedback_events WHERE ticket_id=$1 ORDER BY created_at,id',[ticketId])]);
  return {...summary(row,administrator),images:images.rows.map(r=>({position:r.position,url:`/api/feedback/${ticketId}/images/${r.position}`})),events:events.rows.map(r=>({id:r.id,message:r.message,status:r.status,createdAt:new Date(r.created_at).toISOString()}))};
}
export async function readFeedbackImage({ownerContext,ticketId,position,resources}) {
  resources??=await getGenerationResources();
  // Image access is bound to the ticket owner or an active site owner, never a workspace member.
  const isAdmin=(await resources.pool.query("SELECT 1 FROM users u JOIN system_role_assignments r ON r.owner_id=u.id WHERE u.id=$1 AND u.status='active' AND r.role='site_owner'",[ownerContext?.ownerId??null])).rowCount>0;
  await ticket(resources.pool,{ownerContext,ticketId,administrator:isAdmin});
  if(!/^[1-5]$/.test(String(position)))throw invalid('图片标识无效。');
  const row=(await resources.pool.query('SELECT object_key,mime_type,byte_size FROM feedback_images WHERE ticket_id=$1 AND position=$2',[ticketId,position])).rows[0];
  if(!row)throw new FeedbackError('FEEDBACK_NOT_FOUND','未找到这张反馈图片。',404);
  const object=await resources.storage.send(new GetObjectCommand({Bucket:resources.config.objectStorage.bucket,Key:row.object_key}));
  if(object.ContentLength>FEEDBACK_LIMITS.imageBytes)throw Error('Invalid feedback object size');
  return {bytes:Buffer.from(await object.Body.transformToByteArray()),mimeType:row.mime_type};
}
export async function createFeedback({ownerContext,input,files=[],idempotencyKey,resources,inspect=inspectReferenceImage}) {
  const value=validateFeedback(input,files),requestKey=key(idempotencyKey);
  if(!ownerContext?.ownerId)throw sessionExpiredError();
  resources??=await getGenerationResources();
  const hash=fingerprint([value,...files.map(f=>[f.mimeType,createHash('sha256').update(f.bytes).digest('hex')])]);
  const client=await resources.pool.connect(),ticketId=randomUUID(),stored=[];let committed=false;
  try {
    await client.query('BEGIN');await authorize(client,ownerContext);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`feedback-create:${ownerContext.ownerId}`]);
    const prior=(await client.query('SELECT id,fingerprint FROM feedback_tickets WHERE owner_id=$1 AND request_key=$2',[ownerContext.ownerId,requestKey])).rows[0];
    if(prior){if(prior.fingerprint!==hash)throw new FeedbackError('FEEDBACK_KEY_CONFLICT','同一提交标识的内容不同，请重新提交。',409);await client.query('COMMIT');return {id:prior.id,replayed:true};}
    const count=Number((await client.query("SELECT count(*) FROM feedback_tickets WHERE owner_id=$1 AND created_at>now()-interval '24 hours'",[ownerContext.ownerId])).rows[0].count);
    if(count>=20)throw new FeedbackError('FEEDBACK_RATE_LIMIT','24小时内最多提交20条反馈，请稍后再试。',429);
    for(const file of files)try{await inspect({bytes:file.bytes,declaredMimeType:file.mimeType});}catch{throw invalid('图片无法完整解码，或格式/尺寸不符合要求，请重新导出为JPEG、PNG、WebP。');}
    if(files.length)await prepareObjectStorage(resources);
    await client.query('INSERT INTO feedback_tickets(id,owner_id,category,message,request_key,fingerprint) VALUES($1,$2,$3,$4,$5,$6)',[ticketId,ownerContext.ownerId,value.category,value.message,requestKey,hash]);
    for(const [index,file] of files.entries()){
      const objectKey=`feedback/${ownerContext.ownerId}/${ticketId}/${index+1}`;stored.push(objectKey);
      await resources.storage.send(new PutObjectCommand({Bucket:resources.config.objectStorage.bucket,Key:objectKey,Body:file.bytes,ContentType:file.mimeType}));
      await client.query('INSERT INTO feedback_images(ticket_id,position,object_key,mime_type,byte_size) VALUES($1,$2,$3,$4,$5)',[ticketId,index+1,objectKey,file.mimeType,file.bytes.length]);
    }
    await client.query('COMMIT');committed=true;return {id:ticketId,replayed:false};
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    // A lost COMMIT response can still have committed. Never delete reachable media.
    if(!committed&&stored.length){
      const exists=await resources.pool.query('SELECT 1 FROM feedback_tickets WHERE id=$1',[ticketId]).then(r=>r.rowCount).catch(()=>null);
      if(exists===0)await Promise.allSettled(stored.map(Key=>resources.storage.send(new DeleteObjectCommand({Bucket:resources.config.objectStorage.bucket,Key}))));
    }
    throw error;
  } finally {client.release();}
}
export async function replyFeedback({ownerContext,ticketId,input,idempotencyKey,resources}) {
  const value=validateFeedbackAction(input),requestKey=key(idempotencyKey),hash=fingerprint([id(ticketId),value]);
  resources??=await getGenerationResources();const client=await resources.pool.connect();
  try {
    await client.query('BEGIN');await authorize(client,ownerContext,true);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`feedback-action:${ownerContext.ownerId}`]);
    const prior=(await client.query('SELECT ticket_id,fingerprint FROM feedback_events WHERE actor_owner_id=$1 AND request_key=$2',[ownerContext.ownerId,requestKey])).rows[0];
    if(prior){if(prior.fingerprint!==hash)throw new FeedbackError('FEEDBACK_KEY_CONFLICT','同一操作标识的内容不同。',409);await client.query('COMMIT');return {id:prior.ticket_id,replayed:true};}
    const row=await ticket(client,{ownerContext,ticketId,administrator:true,lock:true});
    if(row.version!==value.version)throw new FeedbackError('FEEDBACK_VERSION_CONFLICT','反馈已更新，请刷新后再回复。',409);
    if(row.status===value.status&&!value.message)throw invalid('请填写回复，或选择新的状态。');
    await client.query('UPDATE feedback_tickets SET status=$2,version=version+1,updated_at=now() WHERE id=$1',[ticketId,value.status]);
    await client.query('INSERT INTO feedback_events(id,ticket_id,actor_owner_id,message,status,request_key,fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),ticketId,ownerContext.ownerId,value.message||null,value.status,requestKey,hash]);
    await client.query('COMMIT');return {id:ticketId,replayed:false};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export function feedbackApiError(error) {
  const known=error instanceof FeedbackError||error instanceof AuthenticationError;
  return {status:known?error.status:503,body:{error:{code:known?error.code:'FEEDBACK_UNAVAILABLE',message:known?error.message:'问题反馈暂时不可用，请稍后重试。'}}};
}
