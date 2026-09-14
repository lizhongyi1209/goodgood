"use client";
import './jcoin.css';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuthenticationSession } from '@/features/auth/http-auth-boundary';
import type { JcoinPage } from '@/shared/contracts/jcoin';
import { readOwnJcoin } from './http-jcoin-boundary';
const date=new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short'});
const EMPTY:JcoinPage={balance:'0',earned:'0',reversed:'0',todayEarned:'0',items:[],nextCursor:null};
export const displayJcoin=(value:string)=>{const [integer,fraction]=value.split('.');return integer.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction?`.${fraction}`:'');};
export function OwnJcoinContent({page}:{page:JcoinPage}) {
  return <><dl className="jcoin-stats"><div><dt>我的 JCOIN</dt><dd>{displayJcoin(page.balance)}</dd></div><div><dt>累计获得</dt><dd>{displayJcoin(page.earned)}</dd></div><div><dt>累计撤回</dt><dd>{displayJcoin(page.reversed)}</dd></div></dl>
    <div className="jcoin-section"><h2>获得记录</h2>{page.items.length===0?<p className="jcoin-state">暂无平台币记录。使用充值积分完成创作后，奖励会记录在这里。</p>:page.items.map(item=><article className="jcoin-record" key={item.id}><div><strong>{item.kind==='mining_reward'?'充值消费奖励':'消费退款撤回'}</strong>{item.consumptionCredits!==null&&<p>有效充值消费 {item.consumptionCredits} 积分</p>}<time dateTime={item.occurredAt}>{date.format(new Date(item.occurredAt))}</time></div><span className={`jcoin-amount ${item.kind==='mining_reward'?'earned':''}`}>{item.amount.startsWith('-')?'':'+'}{displayJcoin(item.amount)} <small>JCOIN</small></span></article>)}</div></>;
}
export function OwnJcoinView({session,onLogin}:{session:AuthenticationSession|null|undefined;onLogin:()=>void}) {
  const [page,setPage]=useState<JcoinPage|null>(null),[loading,setLoading]=useState(true),[more,setMore]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const moreRequest=useRef<AbortController|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    if(!session||session.access.status!=='active') return;
    void (async()=>{setLoading(true);setMore(false);setPage(null);setError('');try {const result=session.preview?EMPTY:await readOwnJcoin(null,controller.signal);if(!controller.signal.aborted) setPage(result);} catch(e) {if(!controller.signal.aborted)setError(e instanceof Error?e.message:'读取失败，请重试。');} finally {if(!controller.signal.aborted)setLoading(false);}})();
    return ()=>{controller.abort();moreRequest.current?.abort();};
  },[session,revision]);
  const loadMore=async()=>{if(!page?.nextCursor||more)return;const controller=new AbortController();moreRequest.current=controller;setMore(true);setError('');try {const result=await readOwnJcoin(page.nextCursor,controller.signal);if(!controller.signal.aborted)setPage(current=>current?{...result,items:[...current.items,...result.items.filter(item=>!current.items.some(prior=>prior.id===item.id))]}:result);} catch(e) {if(!controller.signal.aborted)setError(e instanceof Error?e.message:'读取失败，请重试。');} finally {if(!controller.signal.aborted)setMore(false);}};
  if(!session) return <section className="jcoin-page"><h1>我的平台币</h1><p className="jcoin-state">{session===undefined?'正在确认账户':'登录后查看自己的 JCOIN'}</p>{session===null&&<Button variant="ghost" onClick={onLogin}>登录 GoodGood</Button>}</section>;
  if(session.access.status!=='active') return <section className="jcoin-page" role="alert">账户启用后可查看平台币。</section>;
  return <section className="jcoin-page" aria-label="我的平台币"><header className="jcoin-heading"><div><h1>我的平台币</h1><p>JCOIN 随充值消费累计，目前暂无兑换功能。</p></div><Button variant="ghost" size="icon" aria-label="刷新平台币" disabled={loading||more} onClick={()=>setRevision(r=>r+1)}><RefreshCw size={17}/></Button></header>
    {loading?<p className="jcoin-state" role="status"><LoaderCircle size={18} className="animate-spin"/>正在读取平台币</p>:page&&<OwnJcoinContent page={page}/>}
    {error&&<div className="jcoin-error" role="alert">{error} <Button variant="ghost" onClick={()=>page?.nextCursor?void loadMore():setRevision(r=>r+1)}>重试</Button></div>}
    {page?.nextCursor&&<div className="jcoin-pagination"><Button variant="ghost" disabled={more} onClick={()=>void loadMore()}>{more?'正在加载':'加载更多'}</Button></div>}
  </section>;
}
