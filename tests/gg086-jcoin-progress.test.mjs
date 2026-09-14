import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate as flush} from 'node:timers/promises';
import {jcoinIssuanceProgress,watchJcoinPlan} from '../features/jcoin/jcoin-plan-progress.mjs';

test('issuance progress uses exact issued quota ratio, handles empty, tiny and completed batches',()=>{
  assert.deepEqual(jcoinIssuanceProgress('250000','1000000'),{value:25,text:'25%'});
  assert.deepEqual(jcoinIssuanceProgress('999999.99999999','1000000'),{value:99.99,text:'99.99%'});
  assert.deepEqual(jcoinIssuanceProgress('1000000','1000000'),{value:100,text:'100%'});
  assert.equal(jcoinIssuanceProgress('1000001','1000000').value,100);
  assert.equal(jcoinIssuanceProgress('0.02','1000000').text,'<0.01%');
  for(const [amount,budget] of [['0','1000000'],['10','0'],['broken','100'],['-2','100']])assert.equal(jcoinIssuanceProgress(amount,budget).value,0);
});

function harness(read) {
  const environment=new EventTarget();environment.hidden=false;
  let callback,delay;const plans=[],errors=[];let settled=0;
  const timers={setTimeout(fn,ms){callback=fn;delay=ms;return 1;},clearTimeout(){callback=undefined;}};
  const stop=watchJcoinPlan({read,onPlan:p=>plans.push(p),onError:e=>errors.push(e),onSettled:()=>settled++,environment,timers});
  return {environment,plans,errors,stop,get settled(){return settled;},get delay(){return delay;},get scheduled(){return Boolean(callback);},tick(){const fn=callback;callback=undefined;return fn?.();}};
}
test('polling updates at 15 seconds, preserves old snapshot on error and recovers without overlap',async()=>{
  let calls=0,resolve;
  const h=harness(async()=>{calls++;if(calls===2)throw Error('offline');if(calls===3)return new Promise(r=>{resolve=r;});return {issued:'25'};});
  await flush();assert.equal(h.delay,15000);assert.equal(h.plans.length,1);
  await h.tick();assert.equal(h.plans.length,1);assert.match(h.errors.at(-1).message,/offline/);
  const request=h.tick();h.environment.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,3);
  resolve({issued:'50'});await request;assert.equal(h.plans.at(-1).issued,'50');assert.equal(h.errors.at(-1),null);h.stop();assert.equal(h.scheduled,false);
});
test('hidden pages stop polling, visible pages refresh immediately and unmount aborts stale requests',async()=>{
  let calls=0,resolve,signal;
  const h=harness(async s=>{signal=s;calls++;if(calls===2)return new Promise(r=>{resolve=r;});return {issued:'0'};});
  await flush();h.environment.hidden=true;h.environment.dispatchEvent(new Event('visibilitychange'));assert.equal(h.scheduled,false);
  h.environment.hidden=false;h.environment.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);
  h.stop();assert.equal(signal.aborted,true);resolve({issued:'100'});await flush();assert.equal(h.plans.length,1);assert.equal(h.settled,1);assert.equal(h.scheduled,false);
});
