"use client";

import {useEffect,useRef,useState} from 'react';
import {Heart,LoaderCircle,Search,Sparkles,Trash2,X} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {PrivateObjectImage} from '@/components/ui/private-object-image';
import {ProfileAvatar} from '@/features/profile/personal-profile';
import {imageLineName} from '@/shared/contracts/banana-lines.mjs';
import {gptImageQualityLabel,gptImageBackgroundLabel,gptImageOutputFormatLabel} from '@/features/creation/generation-options';
import {inspirationRequest,type InspirationCase,type CaseParameters,type UseCaseResult} from './http-inspiration-boundary';
import './inspiration.css';
import {CaseComparison} from './case-comparison';
export {CaseComparison} from './case-comparison';

export function CaseParametersList({parameters:p}:{parameters:CaseParameters}) {
  return <dl className="case-parameters"><div><dt>模型</dt><dd>{p.catalogModelName??p.modelId}</dd></div><div><dt>线路</dt><dd>{imageLineName(p.imageLine)}</dd></div><div><dt>比例</dt><dd>{p.aspectRatio}</dd></div><div><dt>分辨率</dt><dd>{p.resolution}</dd></div><div><dt>原作参考图</dt><dd>{p.referenceCount} 张</dd></div><div><dt>原作数量</dt><dd>{p.count} 张</dd></div>
    {p.modelId.startsWith('gpt-image')?<><div><dt>质量</dt><dd>{gptImageQualityLabel(p.quality??'auto')}</dd></div><div><dt>背景</dt><dd>{gptImageBackgroundLabel(p.background??'auto')}</dd></div><div><dt>格式</dt><dd>{gptImageOutputFormatLabel(p.outputFormat??'png')}</dd></div></>:<><div><dt>思考</dt><dd>{p.thinkingLevel==='low'?'低':'高'}</dd></div><div><dt>谷歌搜索</dt><dd>{p.googleSearch?'开启':'关闭'}</dd></div></>}
  </dl>;
}
export function InspirationReadState({loading,error,onRetry}:{loading:boolean;error?:string|null;onRetry:()=>void}) {
  return <div className="inspiration-state" role={error?'alert':'status'}>{loading?<><LoaderCircle size={18}/>正在读取案例</>:<>{error}<button onClick={onRetry}>重试</button></>}</div>;
}
export function InspirationCards({items,onOpen,onLike,busy}:{items:readonly InspirationCase[];onOpen:(id:string)=>void;onLike:(item:InspirationCase)=>void;busy:readonly string[]}) {
  if(!items.length) return <div className="inspiration-empty"><Sparkles size={25}/><strong>还没有案例</strong><p>从自己的图片详情分享作品，让效果成为可复用的灵感。</p></div>;
  return <div className="inspiration-grid">{items.map(item=><article className="inspiration-card" key={item.id}><button className="inspiration-cover" style={{aspectRatio:item.after.width&&item.after.height?item.after.width/item.after.height:1}} onClick={()=>onOpen(item.id)} aria-label={`查看案例：${item.title}`}><PrivateObjectImage src={item.after.url} alt={item.title}/>{item.before&&<span>前后对比</span>}</button><div className="inspiration-card-body"><button className="inspiration-title" onClick={()=>onOpen(item.id)}>{item.title}</button><div className="inspiration-card-meta"><span>{item.author.handle?`@${item.author.handle}`:item.author.displayName}</span><button className={`case-like ${item.liked?'is-liked':''}`} aria-label={`${item.liked?'取消点赞':'点赞'}：${item.title}`} aria-pressed={item.liked} disabled={busy.includes(item.id)} onClick={()=>onLike(item)}><Heart size={15}/>{item.likes}</button></div></div></article>)}</div>;
}

export function InspirationBoard({enabled,onUse}:{enabled:boolean;onUse:(value:UseCaseResult)=>void}) {
  const [search,setSearch]=useState('');const [query,setQuery]=useState('');const [revision,setRevision]=useState(0);
  const [directory,setDirectory]=useState<{items:InspirationCase[];nextCursor:string|null}|null>(null);
  const [error,setError]=useState<string|null>(null);const [moreBusy,setMoreBusy]=useState(false);
  const [selectedId,setSelectedId]=useState<string|null>(null);const [detail,setDetail]=useState<InspirationCase|null>(null);
  const [detailFailure,setDetailFailure]=useState<{id:string;message:string}|null>(null);const [detailRevision,setDetailRevision]=useState(0);
  const [busy,setBusy]=useState<string[]>([]);const [actionError,setActionError]=useState<string|null>(null);
  const [remove,setRemove]=useState<InspirationCase|null>(null);const [useBusy,setUseBusy]=useState(false);
  const openTrigger=useRef<HTMLButtonElement|null>(null);const moreRequest=useRef(0);
  useEffect(()=>{
    if(!enabled) return;let active=true;
    void inspirationRequest<{items:InspirationCase[];nextCursor:string|null}>('/list',{query}).then(value=>{if(active) {setDirectory(value);setError(null);}}).catch(failure=>{if(active) setError(failure instanceof Error?failure.message:'读取失败，请重试。');});
    return ()=>{active=false;moreRequest.current+=1;};
  },[enabled,query,revision]);
  useEffect(()=>{
    if(!selectedId) return;let active=true;
    void inspirationRequest<InspirationCase>(`/${selectedId}`).then(value=>{if(active) {setDetail(value);setDetailFailure(null);}}).catch(failure=>{if(active) setDetailFailure({id:selectedId,message:failure instanceof Error?failure.message:'案例暂时不可用。'});});
    return ()=>{active=false;};
  },[selectedId,detailRevision]);
  const current=detail?.id===selectedId?detail:null;
  function retry() {setDirectory(null);setError(null);setRevision(value=>value+1);}
  function open(id:string) {openTrigger.current=document.activeElement instanceof HTMLButtonElement?document.activeElement:null;setDetail(null);setDetailFailure(null);setActionError(null);setSelectedId(id);}
  async function like(item:InspirationCase) {
    if(busy.includes(item.id)) return;setBusy(values=>[...values,item.id]);setActionError(null);
    try {const update=await inspirationRequest<{liked:boolean;likes:number}>(`/${item.id}/like`,{liked:!item.liked});setDirectory(value=>value?{...value,items:value.items.map(row=>row.id===item.id?{...row,...update}:row)}:null);setDetail(value=>value?.id===item.id?{...value,...update}:value);} catch(failure) {setActionError(failure instanceof Error?failure.message:'点赞失败，请重试。');} finally {setBusy(values=>values.filter(id=>id!==item.id));}
  }
  async function more() {
    if(!directory?.nextCursor||moreBusy) return;const request=++moreRequest.current;setMoreBusy(true);
    try {const value=await inspirationRequest<{items:InspirationCase[];nextCursor:string|null}>('/list',{query,cursor:directory.nextCursor});if(request===moreRequest.current) setDirectory(old=>old?{items:[...old.items,...value.items.filter(item=>!old.items.some(row=>row.id===item.id))],nextCursor:value.nextCursor}:value);} catch(failure) {if(request===moreRequest.current) setError(failure instanceof Error?failure.message:'读取失败。');} finally {setMoreBusy(false);}
  }
  async function use() {
    if(!current||useBusy) return;setUseBusy(true);setActionError(null);
    try {const value=await inspirationRequest<UseCaseResult>(`/${current.id}/use`,{});setSelectedId(null);onUse(value);} catch(failure) {setActionError(failure instanceof Error?failure.message:'案例暂时不可用。');} finally {setUseBusy(false);}
  }
  async function withdraw() {
    if(!remove) return;const id=remove.id;setBusy(values=>[...values,id]);setActionError(null);
    try {await inspirationRequest(`/${id}/withdraw`,{});setDirectory(value=>value?{...value,items:value.items.filter(item=>item.id!==id)}:value);setSelectedId(null);setRemove(null);} catch(failure) {setActionError(failure instanceof Error?failure.message:'下架失败，请重试。');setRemove(null);} finally {setBusy(values=>values.filter(value=>value!==id));}
  }
  return <section className="inspiration-board" aria-label="灵感板"><header className="inspiration-heading"><div><h1>灵感板</h1><p>把喜欢的效果，变成自己的创作。</p></div><form onSubmit={event=>{event.preventDefault();setDirectory(null);setError(null);setQuery(search.trim());setRevision(value=>value+1);}}><Search size={16}/><input aria-label="搜索案例" placeholder="搜索案例" value={search} maxLength={100} onChange={event=>setSearch(event.target.value)}/><button type="submit">搜索</button></form></header>
    {actionError&&!selectedId&&<div className="inspiration-action-error" role="alert">{actionError}</div>}
    {!directory?<InspirationReadState loading={!error} error={error} onRetry={retry}/>:<><InspirationCards items={directory.items} onOpen={open} onLike={item=>void like(item)} busy={busy}/>{error&&<InspirationReadState loading={false} error={error} onRetry={retry}/>}<div className="inspiration-more">{directory.nextCursor&&<button disabled={moreBusy} onClick={()=>void more()}>{moreBusy?'读取中':'查看更多'}</button>}</div></>}
    <Sheet open={Boolean(selectedId)} onOpenChange={value=>{if(!value&&!useBusy) setSelectedId(null);}}><SheetContent className="case-detail-sheet" showCloseButton={false} onCloseAutoFocus={event=>{event.preventDefault();openTrigger.current?.focus();}}><SheetHeader><SheetTitle>{current?.title??'案例详情'}</SheetTitle><SheetDescription>查看效果与原作设置，载入后替换自己的参考图。</SheetDescription></SheetHeader><button className="case-sheet-close" aria-label="关闭案例详情" disabled={useBusy} onClick={()=>setSelectedId(null)}><X size={18}/></button>
      {!current?<InspirationReadState loading={detailFailure?.id!==selectedId} error={detailFailure?.id===selectedId?detailFailure.message:null} onRetry={()=>{setDetailFailure(null);setDetailRevision(value=>value+1);}}/>:<div className="case-detail-body"><CaseComparison before={current.before} after={current.after} title={current.title} mode={current.comparisonMode}/><div className="case-author"><ProfileAvatar className="account-profile-avatar" name={current.author.displayName} url={current.author.avatarUrl}/><div><strong>{current.author.displayName}</strong>{current.author.handle&&<span>@{current.author.handle}</span>}</div><button className={`case-like ${current.liked?'is-liked':''}`} aria-pressed={current.liked} disabled={busy.includes(current.id)} onClick={()=>void like(current)}><Heart size={16}/>{current.likes}<span>{current.liked?'已点赞':'点赞'}</span></button></div>{current.description&&<p className="case-description">{current.description}</p>}<section><h3>提示词</h3>{current.promptVisibility==='hidden'?<p className="case-preset-note"><strong>预设 · 提示词隐藏</strong>使用时可补充要求，也可留空。</p>:<p className="case-prompt">{current.prompt}</p>}</section><section><h3>原作参数</h3><CaseParametersList parameters={current.parameters}/></section>
        {actionError&&<div className="inspiration-action-error" role="alert">{actionError}</div>}<footer className="case-detail-footer">{current.canWithdraw&&<button className="case-withdraw" disabled={busy.includes(current.id)} onClick={()=>setRemove(current)}><Trash2 size={15}/>{current.owned?'撤回分享':'下架案例'}</button>}<button className="case-use" disabled={useBusy} onClick={()=>void use()}>{useBusy?<LoaderCircle size={16}/>:<Sparkles size={16}/>}使用此效果</button><p>{current.promptVisibility==='hidden'?'使用预设和参数；可补充要求，确认积分后再生成。':'载入提示词和参数；请替换参考图，确认积分后再生成。'}</p></footer></div>}
    </SheetContent></Sheet>
    <AlertDialog open={Boolean(remove)} onOpenChange={value=>{if(!value&&!busy.includes(remove?.id??'')) setRemove(null);}}><AlertDialogContent className="inspiration-confirm"><AlertDialogHeader><AlertDialogTitle>{remove?.owned?'撤回这个分享？':'下架这个案例？'}</AlertDialogTitle><AlertDialogDescription>「{remove?.title}」将从灵感板移除，其他用户无法继续查看或使用。原作品和扣费记录会保留。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy.includes(remove?.id??'')}>取消</AlertDialogCancel><AlertDialogAction disabled={busy.includes(remove?.id??'')} onClick={event=>{event.preventDefault();void withdraw();}}>{busy.includes(remove?.id??'')?'处理中':'确认下架'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
