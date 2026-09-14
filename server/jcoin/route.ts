import { readJcoin, queryJcoinPlan, actOnJcoinPlan } from './api.mjs';
import { JcoinError, jcoinApiError } from './errors.mjs';
import { getAuthenticationRuntime } from '@/server/auth/runtime-operations.mjs';
export function jcoinRoute(action: 'own'|'query'|'action') {
  return async (request:Request)=>{
    const headers={'cache-control':'no-store'};
    try {
      if(action!=='own'&&request.headers.get('x-goodgood-admin-action')!=='1') throw new JcoinError('JCOIN_CSRF_FAILED','管理请求未通过安全校验，请刷新后重试。',403);
      const {authenticate}=await getAuthenticationRuntime(),ownerContext=await authenticate(request);
      let input;
      if(action==='own') {const query=new URL(request.url).searchParams;input={limit:query.get('limit')??undefined,cursor:query.get('cursor')};}
      else {const body=await request.text();if(new TextEncoder().encode(body).length>4096) throw new JcoinError('JCOIN_INVALID','请求内容过大。');try {input=JSON.parse(body);} catch {throw new JcoinError('JCOIN_INVALID','请求内容无效。');}}
      const operation=action==='own'?readJcoin:action==='query'?queryJcoinPlan:actOnJcoinPlan;
      return Response.json(await operation({ownerContext,input,idempotencyKey:request.headers.get('idempotency-key')}),{headers});
    } catch(error) {const failure=jcoinApiError(error);return Response.json(failure.body,{status:failure.status,headers});}
  };
}
