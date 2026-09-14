import type { JcoinPlan } from '@/shared/contracts/jcoin';
export function jcoinIssuanceProgress(issued:string,budget:string):{value:number;text:string};
export function watchJcoinPlan(options:{read:(signal:AbortSignal)=>Promise<JcoinPlan>;onPlan:(plan:JcoinPlan)=>void;onError:(error:unknown)=>void;onSettled:()=>void}):()=>void;
