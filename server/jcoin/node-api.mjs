import { readJcoin, queryJcoinPlan, actOnJcoinPlan } from './api.mjs';
import { JcoinError, jcoinApiError } from './errors.mjs';
const paths=new Set(['/api/jcoin','/api/admin/jcoin/query','/api/admin/jcoin/action']);
export function createJcoinNodeApiHandler({authenticate,operations={readJcoin,queryJcoinPlan,actOnJcoinPlan}}) {
  return async function(request,response) {
    const url=new URL(request.url??'/','http://localhost');
    if(!paths.has(url.pathname)) return false;
    const send=(status,body)=>{response.writeHead(status,{'cache-control':'no-store','content-type':'application/json; charset=utf-8'});response.end(JSON.stringify(body));};
    try {
      const own=url.pathname==='/api/jcoin';
      if(request.method!==(own?'GET':'POST')) {send(405,{error:{code:'METHOD_NOT_ALLOWED',message:'请求方法无效。'}});return true;}
      if(!own&&request.headers['x-goodgood-admin-action']!=='1') throw new JcoinError('JCOIN_CSRF_FAILED','管理请求未通过安全校验，请刷新后重试。',403);
      const ownerContext=await authenticate(request);
      let input;
      if(own) input={limit:url.searchParams.get('limit')??undefined,cursor:url.searchParams.get('cursor')};
      else {
        const chunks=[];let size=0;
        for await(const chunk of request) {size+=chunk.length;if(size>4096) throw new JcoinError('JCOIN_INVALID','请求内容过大。');chunks.push(chunk);}
        try {input=JSON.parse(Buffer.concat(chunks).toString());} catch {throw new JcoinError('JCOIN_INVALID','请求内容无效。');}
      }
      const operation=own?operations.readJcoin:url.pathname.endsWith('/query')?operations.queryJcoinPlan:operations.actOnJcoinPlan;
      send(200,await operation({ownerContext,input,idempotencyKey:request.headers['idempotency-key']}));
    } catch(error) {const failure=jcoinApiError(error);send(failure.status,failure.body);}
    return true;
  };
}
