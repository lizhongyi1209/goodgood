// Display only: the issued high-water mark is not reduced by refund recovery.
export function jcoinIssuanceProgress(issued,budget) {
  const atoms=value=>{
    if(!/^\d+(?:\.\d{1,8})?$/.test(value))return 0n;
    const [whole,fraction='']=value.split('.');
    return BigInt(whole)*100000000n+BigInt(fraction.padEnd(8,'0'));
  };
  const total=atoms(budget),amount=atoms(issued);
  const hundredths=total>0n?Number((amount>total?total:amount)*10000n/total):0;
  return {value:hundredths/100,text:hundredths===0&&amount>0n&&total>0n?'<0.01%':`${hundredths/100}%`};
}

// Read-only polling. Preserve the last snapshot on failure and cancel on unmount.
export function watchJcoinPlan({read,onPlan,onError,onSettled,environment=document,timers=globalThis}) {
  const controller=new AbortController();let pending=false,timer;
  const clear=()=>{timers.clearTimeout(timer);};
  const refresh=async()=>{
    if(controller.signal.aborted||pending||environment.hidden)return;
    clear();pending=true;
    try {
      const plan=await read(controller.signal);
      if(!controller.signal.aborted){onPlan(plan);onError(null);}
    } catch(e) {if(!controller.signal.aborted)onError(e);}
    finally {
      pending=false;
      if(!controller.signal.aborted){onSettled();if(!environment.hidden)timer=timers.setTimeout(refresh,15000);}
    }
  };
  const visibility=()=>{clear();if(!environment.hidden)void refresh();};
  environment.addEventListener('visibilitychange',visibility);
  void refresh();
  return ()=>{controller.abort();clear();environment.removeEventListener('visibilitychange',visibility);};
}
