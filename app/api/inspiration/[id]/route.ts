import {handleInspirationFrameworkRequest} from '@/server/inspiration/framework.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {return handleInspirationFrameworkRequest(request,{action:'detail',id:(await params).id});}
