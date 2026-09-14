import {handleInspirationFrameworkRequest} from '@/server/inspiration/framework.mjs';
import {InspirationError,inspirationApiError} from '@/server/inspiration/api.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string;action:string}>}) {
  const route=await params;
  if(!['like','use','view','quote','withdraw','generate'].includes(route.action)) {const failure=inspirationApiError(new InspirationError('INSPIRATION_NOT_FOUND','案例入口不存在。',404));return Response.json(failure.body,{status:404,headers:{'cache-control':'no-store'}});}
  return handleInspirationFrameworkRequest(request,route);
}
