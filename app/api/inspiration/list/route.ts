import {handleInspirationFrameworkRequest} from '@/server/inspiration/framework.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request) {return handleInspirationFrameworkRequest(request,{action:'list'});}
