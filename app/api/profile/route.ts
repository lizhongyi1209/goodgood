import {ProfileError,profileActionRequested,profileApiError,readPersonalProfile,updatePersonalProfile} from '@/server/profile/api.mjs';
import {loadAuthenticationConfig} from '@/server/auth/config.mjs';
import {createRequestAuthenticator} from '@/server/auth/request-authenticator.mjs';
import {getGenerationResources} from '@/server/generation/resources.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function handle(request:Request,write:boolean) {
 try {
  const resources=await getGenerationResources();
  const ownerContext=await createRequestAuthenticator({config:loadAuthenticationConfig(),getPool:async()=>resources.pool})(request);
  if(write&&!profileActionRequested(request)) throw new ProfileError('PROFILE_ACTION_INVALID','资料请求未通过安全校验，请刷新后重试。',403);
  let input;if(write) {const body=await request.text();if(new TextEncoder().encode(body).length>4096) throw new ProfileError('PROFILE_INVALID','资料内容过大。');try {input=JSON.parse(body);} catch {throw new ProfileError('PROFILE_INVALID','资料内容无效。');}}
  return Response.json(write?await updatePersonalProfile({ownerContext,input,resources}):await readPersonalProfile({ownerContext,resources}),{headers:{'cache-control':'no-store'}});
 } catch(error) {const failure=profileApiError(error);return Response.json(failure.body,{status:failure.status,headers:{'cache-control':'no-store'}});}
}
export async function GET(request:Request) {return handle(request,false);}
export async function PATCH(request:Request) {return handle(request,true);}
