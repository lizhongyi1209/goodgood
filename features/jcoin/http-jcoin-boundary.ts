import { goodGoodApiFetch } from '@/features/auth/http-auth-boundary';
import type { JcoinAction, JcoinPage, JcoinPlan } from '@/shared/contracts/jcoin';
async function payload<T>(response:Response):Promise<T> {
  const body=await response.json().catch(()=>{throw new Error('平台币响应无效，请稍后重试。');}) as {error?:{message?:string}};
  if(!response.ok) throw new Error(body.error?.message??'平台币服务暂时不可用，请重试。');
  return body as T;
}
export async function readOwnJcoin(cursor:string|null=null,signal?:AbortSignal) {
  const query=new URLSearchParams({limit:'20'});if(cursor) query.set('cursor',cursor);
  return payload<JcoinPage>(await goodGoodApiFetch(`/api/jcoin?${query}`,{cache:'no-store',signal}));
}
export async function readJcoinPlan(signal?:AbortSignal) {
  return payload<JcoinPlan>(await goodGoodApiFetch('/api/admin/jcoin/query',{method:'POST',headers:{'content-type':'application/json','x-goodgood-admin-action':'1'},body:'{}',cache:'no-store',signal}));
}
export async function changeJcoinPlan(action:JcoinAction,idempotencyKey:string) {
  return payload<{processed?:number;replayed:boolean}>(await goodGoodApiFetch('/api/admin/jcoin/action',{method:'POST',headers:{'content-type':'application/json','x-goodgood-admin-action':'1','idempotency-key':idempotencyKey},body:JSON.stringify({action}),cache:'no-store'}));
}
