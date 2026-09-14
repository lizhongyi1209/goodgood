import {AuthenticationError,sessionExpiredError} from '../auth/errors.mjs';
import {OrganizationError} from '../organizations/errors.mjs';
import {resolveWorkspaceAccess} from '../organizations/workspace-access.mjs';
import {getGenerationResources} from '../generation/resources.mjs';
import {signAssetRead} from '../generation/storage.mjs';
import {lockReferenceLifecycle} from '../references/lifecycle-lock.mjs';
import {newRequestId} from '../observability/http.mjs';
export class ProfileError extends Error {
 constructor(code,message,status=400) {super(message);this.code=code;this.status=status;}
}
export function validateProfileInput(input) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['displayName','handle','avatarReferenceId','version'].includes(key))) throw new ProfileError('PROFILE_INVALID','资料内容无效，请检查后重试。');
 const displayName=typeof input.displayName==='string'?input.displayName.trim():'';
 const handle=typeof input.handle==='string'?input.handle.trim().replace(/^@/,'').toLowerCase():'';
 if(Array.from(displayName).length<1||Array.from(displayName).length>30||/[\p{Cc}\p{Cf}]/u.test(displayName)) throw new ProfileError('PROFILE_INVALID','名称需为 1–30 个字符。');
 if(!/^[a-z0-9_]{3,24}$/.test(handle)) throw new ProfileError('PROFILE_INVALID','用户名需为 3–24 位字母、数字或下划线。');
 if(!Number.isInteger(input.version)||input.version<0||input.version>2147483646) throw new ProfileError('PROFILE_INVALID','资料版本无效，请刷新后重试。');
 const avatarReferenceId=input.avatarReferenceId;
 if(avatarReferenceId!==null&&(typeof avatarReferenceId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(avatarReferenceId))) throw new ProfileError('PROFILE_INVALID','头像无效，请重新上传。');
 return {displayName,handle,avatarReferenceId,version:input.version};
}
async function profileDto(row,resources) {
 return {displayName:row?.display_name??'GoodGood 用户',handle:row?.handle??null,avatarReferenceId:row?.avatar_reference_id??null,avatarUrl:row?.object_key&&row.upload_state==='ready'&&row.moderation_state==='accepted'&&!row.object_deleted_at?await signAssetRead({bucket:resources.config.objectStorage.bucket,key:row.object_key,publicStorage:resources.publicStorage}):null,version:row?.version??0};
}
const PROFILE_SELECT=`SELECT p.*,ra.object_key,ra.upload_state,ra.moderation_state,ra.object_deleted_at FROM personal_profiles p LEFT JOIN reference_assets ra ON ra.id=p.avatar_reference_id WHERE p.owner_id=$1`;
export async function readPersonalProfile({ownerContext,resources}) {
 if(!ownerContext?.ownerId) throw sessionExpiredError();
 resources??=await getGenerationResources();
 await resolveWorkspaceAccess(resources.pool,{ownerId:ownerContext.ownerId});
 const result=await resources.pool.query(PROFILE_SELECT,[ownerContext.ownerId]);
 return profileDto(result.rows[0],resources);
}
export async function updatePersonalProfile({ownerContext,input,resources}) {
 if(!ownerContext?.ownerId) throw sessionExpiredError();
 const value=validateProfileInput(input);resources??=await getGenerationResources();const client=await resources.pool.connect();
 try {
  await client.query('BEGIN');await lockReferenceLifecycle(client);
  const workspace=await resolveWorkspaceAccess(client,{ownerId:ownerContext.ownerId,write:true});
  if(value.avatarReferenceId) {
   const avatar=await client.query(`SELECT id FROM reference_assets WHERE id=$1 AND creator_owner_id=$2 AND owner_id=$2 AND workspace_id=$3 AND upload_state='ready' AND moderation_state='accepted' AND object_deleted_at IS NULL AND cleanup_lease_owner IS NULL FOR UPDATE`,[value.avatarReferenceId,ownerContext.ownerId,workspace.id]);
   if(!avatar.rows.length) throw new ProfileError('PROFILE_AVATAR_INVALID','头像不可用，请重新上传。');
  }
  const result=value.version===0?await client.query(`INSERT INTO personal_profiles(owner_id,display_name,handle,avatar_reference_id) VALUES($1,$2,$3,$4) ON CONFLICT(owner_id) DO NOTHING RETURNING *`,[ownerContext.ownerId,value.displayName,value.handle,value.avatarReferenceId]):await client.query(`UPDATE personal_profiles SET display_name=$2,handle=$3,avatar_reference_id=$4,version=version+1,updated_at=now() WHERE owner_id=$1 AND version=$5 RETURNING *`,[ownerContext.ownerId,value.displayName,value.handle,value.avatarReferenceId,value.version]);
  if(!result.rows.length) throw new ProfileError('PROFILE_CONFLICT','资料已在其他页面更新，请重新读取后再编辑。',409);
  const full=await client.query(PROFILE_SELECT,[ownerContext.ownerId]);const dto=await profileDto(full.rows[0],resources);await client.query('COMMIT');return dto;
 } catch(error) {await client.query('ROLLBACK');if(error.code==='23505') throw new ProfileError('PROFILE_HANDLE_TAKEN','这个用户名已被使用，请换一个。',409);throw error;} finally {client.release();}
}
export function profileActionRequested(request) {
 const headers=request.headers;return (typeof headers?.get==='function'?headers.get('x-goodgood-profile-action'):headers?.['x-goodgood-profile-action'])==='1';
}
export function profileApiError(error,requestId=newRequestId()) {
 const known=error instanceof ProfileError||error instanceof AuthenticationError||error instanceof OrganizationError;
 return {status:known?error.status:503,body:{error:{code:known?error.code:'PROFILE_UNAVAILABLE',message:known?error.message:'个人资料暂时无法读取，请重试。',requestId,retryable:!known}}};
}
