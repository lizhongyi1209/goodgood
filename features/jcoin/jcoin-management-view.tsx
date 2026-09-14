"use client";
import './jcoin.css';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { JcoinAction, JcoinBatch, JcoinPlan } from '@/shared/contracts/jcoin';
import { changeJcoinPlan, readJcoinPlan } from './http-jcoin-boundary';
import { displayJcoin } from './own-jcoin-view';
import { jcoinIssuanceProgress, watchJcoinPlan } from './jcoin-plan-progress.mjs';
const labels={draft:'未开启',active:'进行中',paused:'已暂停',exhausted:'已发完'};
const actionLabels:Record<string,string>={start:'开启第一期',pause:'暂停分发',resume:'恢复分发',process:'处理消费奖励'};
const date=new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'});
const updatedTime=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Shanghai'});
function JcoinBatchCard({batch:b,busy,onAction}:{batch:JcoinBatch;busy:boolean;onAction:(action:JcoinAction)=>void}) {
  const scheduled=b.status==='active'&&new Date(b.startsAt)>new Date();
  const progress=jcoinIssuanceProgress(b.issued,b.budget);
  return <article className="jcoin-batch-card" aria-labelledby={`jcoin-batch-${b.number}`}>
    <header className="jcoin-batch-heading"><div><h3 id={`jcoin-batch-${b.number}`}>第 {b.number} 期</h3><p>充值消费挖矿</p></div><span className={`jcoin-batch-status ${b.status}`}>{scheduled?'已开启，等待起算':labels[b.status]}</span></header>
    <dl className="jcoin-batch-amounts"><div className="jcoin-batch-budget"><dt>本期限定额度</dt><dd>{displayJcoin(b.budget)} <span>JCOIN</span></dd></div><div><dt>已发放</dt><dd>{displayJcoin(b.issued)}</dd></div><div><dt>剩余额度</dt><dd>{displayJcoin(b.remaining)}</dd></div></dl>
    <div className="jcoin-batch-progress"><div><span>发行进度</span><strong>{progress.text}</strong></div><Progress value={progress.value} aria-label={`第${b.number}期发行进度`} aria-valuetext={progress.text}/></div>
    <dl className="jcoin-batch-rules"><div><dt>奖励系数</dt><dd>每100有效充值消费积分奖励 {b.rewardPer100Credits} 枚</dd></div><div><dt>消费起算 · 北京时间</dt><dd>{date.format(new Date(b.startsAt))}</dd></div><div><dt>本期退款回收</dt><dd>{displayJcoin(b.recovered)} JCOIN</dd></div></dl>
    <p className="jcoin-note">本期预计对应50万元有效充值消费，发完为止，没有截止日期。开启后额度和系数固定。</p>
    <footer className="jcoin-batch-footer">
    <div className="jcoin-actions">{b.status==='draft'?<Button disabled={busy} onClick={()=>onAction('start')}>开启第一期</Button>:b.status==='active'?<Button variant="ghost" disabled={busy} onClick={()=>onAction('pause')}>暂停分发</Button>:b.status==='paused'?<Button disabled={busy} onClick={()=>onAction('resume')}>恢复分发</Button>:<p className="jcoin-note">本期已发完，下一批需另行制定并开启。</p>}
      <Button variant="ghost" disabled={busy} onClick={()=>onAction('process')}>{busy?'正在处理':'处理消费奖励'}</Button></div>
    </footer>
  </article>;
}
export function JcoinManagementContent({plan,busy,onAction}:{plan:JcoinPlan;busy:boolean;onAction:(action:JcoinAction)=>void}) {
  return <><dl className="jcoin-stats"><div><dt>固定总量</dt><dd>{displayJcoin(plan.supply)}</dd></div><div><dt>用户回馈总池</dt><dd>{displayJcoin(plan.userPool)}</dd></div><div><dt>已发放</dt><dd>{displayJcoin(plan.issued)}</dd></div></dl>
    <p className="jcoin-note">回馈池未安排 {displayJcoin(plan.unassigned)} JCOIN。用户只看自己的统计，暂不提供兑换。创作激励保持未启动。</p>
    <section className="jcoin-section" aria-labelledby="jcoin-batches-heading"><h2 id="jcoin-batches-heading">发行批次</h2><div className="jcoin-batch-grid"><JcoinBatchCard batch={plan.batch} busy={busy} onAction={onAction}/></div>
    <p className="jcoin-note">系统会定期处理已结算消费；暂停时仍修正退款。历史来源缺失或混合测试资金会保守排除。来源异常 {plan.excludedCount} 条 · 最近处理 {plan.lastProcessedAt?date.format(new Date(plan.lastProcessedAt)):'暂无'}</p></section>
    <section className="jcoin-section"><h2>近期管理操作</h2>{plan.actions.length?plan.actions.map(a=><div key={a.id} className="jcoin-admin-history">{actionLabels[a.action]??a.action} · {a.actorEmail}<time dateTime={a.occurredAt}>{date.format(new Date(a.occurredAt))}</time></div>):<p className="jcoin-note">暂无管理操作</p>}</section>
  </>;
}
export function JcoinManagementView() {
  const [plan,setPlan]=useState<JcoinPlan|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState(false),[revision,setRevision]=useState(0);
  const [pollError,setPollError]=useState('');
  const retry=useRef<{action:JcoinAction;key:string}|null>(null);
  useEffect(()=>{
    if(busy||confirm)return;
    return watchJcoinPlan({read:readJcoinPlan,onPlan:setPlan,onError:e=>setPollError(e?(e instanceof Error?e.message:'读取失败，请重试。'):''),onSettled:()=>setLoading(false)});
  },[revision,busy,confirm]);
  const run=async(action:JcoinAction)=>{
    if(busy)return;setBusy(true);setError('');setNotice('');
    if(retry.current?.action!==action) retry.current={action,key:`jcoin-${action}-${crypto.randomUUID()}`};
    try {const result=await changeJcoinPlan(action,retry.current.key);retry.current=null;setConfirm(false);setPlan(null);setNotice(action==='process'?`已处理 ${result.processed??0} 条消费与退款记录。`:'管理操作已完成。');setRevision(r=>r+1);}
    catch(e) {setError(e instanceof Error?e.message:'操作失败，请重试。');} finally {setBusy(false);}
  };
  return <section className="jcoin-page" aria-label="平台币计划与管理"><header className="jcoin-heading"><div><h1>平台币</h1><p>JCOIN 发行计划与消费奖励管理</p></div><Button variant="ghost" size="icon" disabled={loading||busy} aria-label="刷新平台币计划" onClick={()=>setRevision(r=>r+1)}><RefreshCw size={17}/></Button></header>
    {loading?<p className="jcoin-state" role="status"><LoaderCircle size={18} className="animate-spin"/>正在读取平台币计划</p>:plan&&<JcoinManagementContent plan={plan} busy={busy} onAction={a=>a==='start'?setConfirm(true):void run(a)}/>}
    <p className="jcoin-note">发行数据每15秒自动刷新{plan?` · 数据更新于 ${updatedTime.format(new Date(plan.measuredAt))}（北京时间）`:''}</p>
    {notice&&<p className="jcoin-note" role="status">{notice}</p>}{(error||pollError)&&<div className="jcoin-error" role="alert">{error||pollError}{plan&&pollError&&!error?'（当前保留上次数据）':''} <Button variant="ghost" disabled={busy} onClick={()=>{setError('');setRevision(r=>r+1);}}>重试</Button></div>}
    <Dialog open={confirm} onOpenChange={open=>{if(!busy)setConfirm(open);}}><DialogContent><DialogHeader><DialogTitle>开启第一期充值消费挖矿</DialogTitle><DialogDescription>本期100万枚，每100有效充值消费积分奖励2枚，按北京时间2026年9月18日00:00起算。开启后规则固定，按可靠结算记录分发；用户仅累计，无兑换功能。</DialogDescription></DialogHeader>{error&&<p role="alert" className="jcoin-error">{error}</p>}<DialogFooter><Button variant="ghost" disabled={busy} onClick={()=>setConfirm(false)}>取消</Button><Button disabled={busy} onClick={()=>void run('start')}>{busy?'正在开启':'确认开启'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
