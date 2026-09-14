import {Readable} from 'node:stream';
import {FeedbackError,feedbackApiError,createFeedback,listFeedback,readFeedback,readFeedbackImage,replyFeedback} from './api.mjs';
import {FEEDBACK_LIMITS} from '../../shared/contracts/feedback.mjs';
const JSON_HEADERS={'cache-control':'no-store','content-type':'application/json; charset=utf-8'};
export async function feedbackBody(request,limit) {
  const reader=request.body?.getReader();if(!reader)return Buffer.alloc(0);
  let size=0;const chunks=[];
  try {for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw new FeedbackError('FEEDBACK_TOO_LARGE','提交内容过大，请减少图片或文字。',413);chunks.push(Buffer.from(value));}}
  finally {reader.releaseLock();}
  return Buffer.concat(chunks);
}
export async function handleFeedbackHttp(request,{authenticateSession,resources,operations={createFeedback,listFeedback,readFeedback,readFeedbackImage,replyFeedback}}) {
  const url=new URL(request.url),path=url.pathname,admin=path.startsWith('/api/admin/feedback');
  const json=(body,status=200)=>Response.json(body,{status,headers:JSON_HEADERS});
  try {
    const ownerContext=await authenticateSession(request);
    const base=admin?'/api/admin/feedback':'/api/feedback';
    const detail=path.match(/^\/api\/(?:admin\/)?feedback\/([0-9a-f-]{36})$/i);
    const image=path.match(/^\/api\/feedback\/([0-9a-f-]{36})\/images\/([1-5])$/i);
    const reply=path.match(/^\/api\/admin\/feedback\/([0-9a-f-]{36})\/reply$/i);
    if((admin||request.method!=='GET')&&request.headers.get(admin?'x-goodgood-admin-action':'x-goodgood-feedback-action')!=='1')throw new FeedbackError('FEEDBACK_CSRF','请求未通过安全校验，请刷新后重试。',403);
    const args={ownerContext,administrator:admin,resources};
    if(path===base&&(admin?request.method==='POST':request.method==='GET')){
      let input={cursor:url.searchParams.get('cursor'),status:url.searchParams.get('status')};
      if(admin)try{input=JSON.parse((await feedbackBody(request,8192)).toString());}catch(e){if(e instanceof FeedbackError)throw e;throw new FeedbackError('FEEDBACK_INVALID','查询内容无效。');}
      return json(await operations.listFeedback({...args,input}));
    }
    if(!admin&&path===base&&request.method==='POST'){
      const bytes=await feedbackBody(request,FEEDBACK_LIMITS.bodyBytes);let form;
      try {form=await new Response(bytes,{headers:{'content-type':request.headers.get('content-type')??''}}).formData();}catch{throw new FeedbackError('FEEDBACK_INVALID','提交格式无效，请重新提交。');}
      if([...form.keys()].some(k=>!['category','message','images'].includes(k))||form.getAll('message').length!==1||form.getAll('category').length!==1||form.getAll('images').length>5)throw new FeedbackError('FEEDBACK_INVALID','反馈字段无效，最多5张图片。');
      const files=[];
      for(const file of form.getAll('images')){
        if(typeof file==='string'||file.size>FEEDBACK_LIMITS.imageBytes)throw new FeedbackError('FEEDBACK_INVALID','单张图片最多10 MB。');
        files.push({mimeType:file.type,bytes:Buffer.from(await file.arrayBuffer())});
      }
      return json(await operations.createFeedback({...args,input:{category:form.get('category'),message:form.get('message')},files,idempotencyKey:request.headers.get('idempotency-key')}),201);
    }
    if(detail&&request.method==='GET')return json(await operations.readFeedback({...args,ticketId:detail[1]}));
    if(image&&request.method==='GET'){
      const content=await operations.readFeedbackImage({...args,ticketId:image[1],position:image[2]});
      return new Response(content.bytes,{headers:{'cache-control':'private, no-store','content-type':content.mimeType,'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"}});
    }
    if(reply&&request.method==='POST'){
      let input;try{input=JSON.parse((await feedbackBody(request,16384)).toString());}catch(e){if(e instanceof FeedbackError)throw e;throw new FeedbackError('FEEDBACK_INVALID','回复内容无效。');}
      return json(await operations.replyFeedback({...args,ticketId:reply[1],input,idempotencyKey:request.headers.get('idempotency-key')}));
    }
    return json({error:{code:'FEEDBACK_METHOD',message:'请求地址或方法无效。'}},405);
  }catch(error){const failure=feedbackApiError(error);return json(failure.body,failure.status);}
}
export function createFeedbackNodeApiHandler(options) {
  return async(request,response)=>{
    const path=new URL(request.url??'/','http://localhost').pathname;
    if(!/^\/api\/(?:admin\/)?feedback(?:\/|$)/.test(path))return false;
    try {
      // Authenticate before accepting a potentially large multipart body.
      const ownerContext=await options.authenticateSession(request);
      const headers=new Headers();for(const [name,value] of Object.entries(request.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
      const native=new Request(`http://localhost${request.url}`,{method:request.method,headers,...(request.method!=='GET'&&request.method!=='HEAD'?{body:Readable.toWeb(request),duplex:'half'}:{})});
      const result=await handleFeedbackHttp(native,{...options,authenticateSession:async()=>ownerContext});
      response.writeHead(result.status,Object.fromEntries(result.headers));response.end(Buffer.from(await result.arrayBuffer()));
    }catch(error){const failure=feedbackApiError(error);response.writeHead(failure.status,JSON_HEADERS);response.end(JSON.stringify(failure.body));}
    return true;
  };
}
