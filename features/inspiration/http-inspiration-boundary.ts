import {goodGoodApiFetch} from '@/features/auth/http-auth-boundary';
import type {GenerationInputSnapshot} from '@/shared/contracts/generation';

export type CaseImage={url:string;width?:number;height?:number};
export type CaseAuthor={displayName:string;handle:string|null;avatarUrl:string|null};
export type CaseParameters=Omit<GenerationInputSnapshot,'prompt'|'references'> & {referenceCount:number};
export type InspirationCase={
  id:string;title:string;description:string;prompt:string|null;parameters:CaseParameters;
  promptVisibility:'public'|'hidden';comparisonMode:'side_by_side'|'hover';
  author:CaseAuthor;after:CaseImage;before:CaseImage|null;
  likes:number;liked:boolean;canWithdraw:boolean;owned:boolean;createdAt:string;
};
export type CasePreparation={assetId:string;prompt:string;parameters:CaseParameters;author:CaseAuthor;after:CaseImage;beforeOptions:(CaseImage&{id:string;name:string})[]};
export type UseCaseResult={recipe:GenerationInputSnapshot;referenceCount:number;title:string;caseId:string;promptVisibility:'public'|'hidden'};

export class InspirationBoundaryError extends Error {
  constructor(readonly code:string,message:string) {super(message);}
}
export async function inspirationRequest<T>(path:string,input?:unknown):Promise<T> {
  const response=await goodGoodApiFetch(`/api/inspiration${path}`,{
    cache:'no-store',...(input===undefined?{}:{method:'POST',headers:{'content-type':'application/json','x-goodgood-inspiration-action':'1'},body:JSON.stringify(input)}),
  });
  const payload=await response.json() as T & {error?:{code?:string;message?:string}};
  if(!response.ok) throw new InspirationBoundaryError(payload.error?.code??'INSPIRATION_UNAVAILABLE',payload.error?.message??'灵感板暂时不可用，请重试。');
  return payload;
}
