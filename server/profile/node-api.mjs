import {ProfileError,profileActionRequested,profileApiError,readPersonalProfile,updatePersonalProfile} from './api.mjs';
import {requestIdFor} from '../observability/http.mjs';
export function createProfileNodeApiHandler({authenticate,operations={readPersonalProfile,updatePersonalProfile}}) {
 return async(request,response)=>{
  if(new URL(request.url??'/','http://localhost').pathname!=='/api/profile') return false;
  const send=(status,body,extra={})=>{response.writeHead(status,{'cache-control':'no-store','content-type':'application/json; charset=utf-8',...extra});response.end(JSON.stringify(body));};
  try {
   if(!['GET','PATCH'].includes(request.method)) {send(405,{error:'method_not_allowed'},{allow:'GET, PATCH'});return true;}
   const ownerContext=await authenticate(request);
   if(request.method==='GET') send(200,await operations.readPersonalProfile({ownerContext}));
   else {
    if(!profileActionRequested(request)) throw new ProfileError('PROFILE_ACTION_INVALID','资料请求未通过安全校验，请刷新后重试。',403);
    let size=0;const chunks=[];for await(const chunk of request) {size+=chunk.length;if(size>4096) throw new ProfileError('PROFILE_INVALID','资料内容过大。');chunks.push(chunk);}
    let input;try {input=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new ProfileError('PROFILE_INVALID','资料内容无效。');}
    send(200,await operations.updatePersonalProfile({ownerContext,input}));
   }
  } catch(error) {const failure=profileApiError(error,requestIdFor(request));send(failure.status,failure.body);}
  return true;
 };
}
