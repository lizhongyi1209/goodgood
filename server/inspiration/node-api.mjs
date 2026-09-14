import {InspirationError,inspirationOperation,inspirationActionRequested,inspirationApiError} from './api.mjs';
import {requestIdFor} from '../observability/http.mjs';

export function inspirationRequestRoute(pathname,method) {
  if(pathname==='/api/inspiration') return {action:method==='GET'?'list':'publish'};
  if(pathname==='/api/inspiration/list') return {action:'list'};
  if(pathname==='/api/inspiration/prepare') return {action:'prepare'};
  const match=pathname.match(/^\/api\/inspiration\/([^/]+)(?:\/(like|use|withdraw))?$/);
  return match?{action:match[2]??'detail',id:match[1]}:null;
}
export function createInspirationNodeApiHandler({authenticate,operation=inspirationOperation}) {
  return async(request,response)=>{
    const url=new URL(request.url??'/','http://localhost');
    const route=inspirationRequestRoute(url.pathname,request.method);
    if(!route) return false;
    const send=(status,body,extra={})=>{response.writeHead(status,{'cache-control':'no-store','content-type':'application/json; charset=utf-8',...extra});response.end(JSON.stringify(body));};
    try {
      const expected=route.action==='detail'||(route.action==='list'&&url.pathname==='/api/inspiration')?'GET':'POST';
      if(request.method!==expected) {send(405,{error:'method_not_allowed'},{allow:expected});return true;}
      const ownerContext=await authenticate(request);
      let input={};
      if(expected==='POST') {
        if(!inspirationActionRequested(request)) throw new InspirationError('INSPIRATION_ACTION_INVALID','案例请求未通过安全校验，请刷新后重试。',403);
        const chunks=[];let size=0;
        for await(const chunk of request) {size+=chunk.length;if(size>8192) throw new InspirationError('INSPIRATION_INVALID','案例请求内容过大。');chunks.push(chunk);}
        try {input=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new InspirationError('INSPIRATION_INVALID','案例请求内容无效。');}
      }
      send(200,await operation({...route,input,ownerContext}));
    } catch(error) {const failure=inspirationApiError(error,requestIdFor(request));send(failure.status,failure.body);}
    return true;
  };
}
