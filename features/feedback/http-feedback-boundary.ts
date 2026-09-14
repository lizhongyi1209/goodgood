import {goodGoodApiFetch} from '@/features/auth/http-auth-boundary';
import type {FeedbackDetail,FeedbackList,FeedbackCategory,FeedbackStatus} from '@/shared/contracts/feedback';
async function payload<T>(response:Response):Promise<T>{const body=await response.json().catch(()=>{throw new Error('反馈响应无效，请重试。');}) as {error?:{message?:string}};if(!response.ok)throw new Error(body.error?.message??'问题反馈暂时不可用，请重试。');return body as T;}
export async function queryFeedback(administrator:boolean,cursor:string|null,status:string,signal?:AbortSignal) {
  return payload<FeedbackList>(await goodGoodApiFetch(administrator?'/api/admin/feedback':`/api/feedback?${new URLSearchParams({...(cursor?{cursor}:{}),...(status==='all'?{}:{status})})}`,administrator?{method:'POST',headers:{'content-type':'application/json','x-goodgood-admin-action':'1'},body:JSON.stringify({cursor,status:status==='all'?null:status}),cache:'no-store',signal}:{cache:'no-store',signal}));
}
export async function getFeedback(id:string,administrator:boolean,signal?:AbortSignal){return payload<FeedbackDetail>(await goodGoodApiFetch(`/api/${administrator?'admin/':''}feedback/${encodeURIComponent(id)}`,{headers:administrator?{'x-goodgood-admin-action':'1'}:{},cache:'no-store',signal}));}
export async function submitFeedback(category:FeedbackCategory,message:string,files:readonly File[],key:string) {
  const form=new FormData();form.set('category',category);form.set('message',message);files.forEach(file=>form.append('images',file));
  return payload<{id:string;replayed:boolean}>(await goodGoodApiFetch('/api/feedback',{method:'POST',headers:{'x-goodgood-feedback-action':'1','idempotency-key':key},body:form}));
}
export async function respondToFeedback(id:string,status:FeedbackStatus,message:string,version:number,key:string){return payload<{id:string}>(await goodGoodApiFetch(`/api/admin/feedback/${id}/reply`,{method:'POST',headers:{'content-type':'application/json','x-goodgood-admin-action':'1','idempotency-key':key},body:JSON.stringify({status,message,version})}));}
