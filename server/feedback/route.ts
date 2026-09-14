import {getAuthenticationRuntime} from '@/server/auth/runtime-operations.mjs';
import {handleFeedbackHttp} from './http.mjs';
export async function feedbackRoute(request:Request) {
  const {authenticateSession}=await getAuthenticationRuntime();
  return handleFeedbackHttp(request,{authenticateSession,resources:undefined});
}
