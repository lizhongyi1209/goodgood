import {loadAuthenticationConfig} from '../auth/config.mjs';
import {createRequestAuthenticator} from '../auth/request-authenticator.mjs';
import {getGenerationResources} from '../generation/resources.mjs';
import {submitGeneration,generationApiError} from '../generation/api.mjs';
import {InspirationError,inspirationOperation,inspirationActionRequested,inspirationApiError} from './api.mjs';

export async function handleInspirationFrameworkRequest(request,route) {
  const headers={'cache-control':'no-store'};
  try {
    const resources=await getGenerationResources();
    const ownerContext=await createRequestAuthenticator({config:loadAuthenticationConfig(),getPool:async()=>resources.pool})(request);
    let input={};
    if(request.method==='POST') {
      if(!inspirationActionRequested(request)) throw new InspirationError('INSPIRATION_ACTION_INVALID','案例请求未通过安全校验，请刷新后重试。',403);
      const body=await request.text();
      if(new TextEncoder().encode(body).length>(['publish','generate'].includes(route.action)?32768:8192)) throw new InspirationError('INSPIRATION_INVALID','案例请求内容过大。');
      try {input=JSON.parse(body);} catch {throw new InspirationError('INSPIRATION_INVALID','案例请求内容无效。');}
    }
    if(route.action==='generate') {const result=await submitGeneration({input,presetCaseId:route.id,ownerContext,idempotencyKey:request.headers.get('idempotency-key')});return Response.json(result.job,{headers});}
    return Response.json(await inspirationOperation({...route,input,ownerContext,resources}),{headers});
  } catch(error) {const failure=route.action==='generate'&&!(error instanceof InspirationError)?generationApiError(error):inspirationApiError(error);return Response.json(failure.body,{status:failure.status,headers});}
}
