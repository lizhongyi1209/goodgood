"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews and authenticated private originals must bypass the public image optimizer. */
import './feedback.css';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,LoaderCircle,Plus,RefreshCw,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import type {AuthenticationSession} from '@/features/auth/http-auth-boundary';
import type {FeedbackCategory,FeedbackStatus,FeedbackDetail,FeedbackList} from '@/shared/contracts/feedback';
import {FEEDBACK_CATEGORIES,FEEDBACK_STATUSES,FEEDBACK_LIMITS} from '@/shared/contracts/feedback.mjs';
import {queryFeedback,getFeedback,submitFeedback,respondToFeedback} from './http-feedback-boundary';
const date=new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'});
const messageOf=(e:unknown)=>e instanceof Error?e.message:'问题反馈暂时不可用，请重试。';
function CategorySelect({value,onChange,disabled}:{value:FeedbackCategory;onChange:(v:FeedbackCategory)=>void;disabled:boolean}){
  return <Select value={value} onValueChange={v=>onChange(v as FeedbackCategory)} disabled={disabled}><SelectTrigger id="feedback-category"><SelectValue/></SelectTrigger><SelectContent position="popper" side="bottom" align="start" avoidCollisions={false}>{Object.entries(FEEDBACK_CATEGORIES).map(([v,label])=><SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select>;
}
export function FeedbackForm({onSubmitted,onBusyChange}:{onSubmitted:(id:string)=>void;onBusyChange?:(busy:boolean)=>void}) {
  const [category,setCategory]=useState<FeedbackCategory>('other'),[message,setMessage]=useState(''),[images,setImages]=useState<{id:string;file:File;url:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const input=useRef<HTMLInputElement>(null),urls=useRef(new Set<string>()),retry=useRef<{signature:string;key:string}|null>(null);
  useEffect(()=>{const current=urls.current;return()=>{for(const url of current)URL.revokeObjectURL(url);current.clear();};},[]);
  const add=(files:File[])=>{
    setError('');if(images.length+files.length>5){setError('最多可提交5张图片，请减少选择数量。');return;}
    if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size<1||f.size>FEEDBACK_LIMITS.imageBytes)){setError('图片仅支持JPEG、PNG、WebP，单张最多10 MB。');return;}
    setImages(previous=>[...previous,...files.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return {id:crypto.randomUUID(),file,url};})]);
  };
  const send=async()=>{
    if(busy)return;if(!message.trim()||Array.from(message.trim()).length>4000){setError('请填写1–4000字反馈信息。');return;}
    const signature=JSON.stringify([category,message.trim(),images.map(i=>i.id)]);
    if(retry.current?.signature!==signature)retry.current={signature,key:`feedback-${crypto.randomUUID()}`};
    setBusy(true);onBusyChange?.(true);setError('');
    try{const result=await submitFeedback(category,message.trim(),images.map(i=>i.file),retry.current.key);retry.current=null;onSubmitted(result.id);}catch(e){setError(messageOf(e));}finally{setBusy(false);onBusyChange?.(false);}
  };
  return <form className="feedback-form" onSubmit={e=>{e.preventDefault();void send();}}>
    <div className="feedback-field"><label htmlFor="feedback-category">问题类型</label><CategorySelect value={category} onChange={setCategory} disabled={busy}/></div>
    <div className="feedback-field"><label htmlFor="feedback-message">反馈信息</label><Textarea id="feedback-message" rows={5} maxLength={4000} placeholder="请描述遇到的问题、操作步骤，以及你期望的结果。" value={message} disabled={busy} onChange={e=>setMessage(e.target.value)}/><span className="feedback-note">{Array.from(message).length} / 4000</span></div>
    <div className="feedback-field"><span id="feedback-images-label">问题图片 · {images.length} / 5</span><input ref={input} aria-labelledby="feedback-images-label" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy||images.length>=5} onChange={e=>{add(Array.from(e.target.files??[]));e.target.value='';}}/>
      <div className="feedback-image-tray">{images.map((image,index)=><div key={image.id} className="feedback-preview"><img src={image.url} alt={`待提交的问题图片${index+1}`}/><Button type="button" variant="ghost" size="icon" aria-label={`移除问题图片${index+1}`} disabled={busy} onClick={()=>{URL.revokeObjectURL(image.url);urls.current.delete(image.url);setImages(previous=>previous.filter(i=>i.id!==image.id));}}><X size={14}/></Button></div>)}<Button type="button" variant="ghost" disabled={busy||images.length>=5} onClick={()=>input.current?.click()}><ImagePlus size={17}/>添加图片</Button></div>
      <p className="feedback-note">最多5张，单张10 MB。支持JPEG、PNG、WebP；图片长宽64–8192像素，总像素最多4000万。仅你和站长可查看。</p></div>
    {error&&<p className="feedback-error" role="alert">{error}</p>}<Button type="submit" disabled={busy||!message.trim()}>{busy?<><LoaderCircle size={16} className="animate-spin"/>正在提交</>:'提交反馈'}</Button>
  </form>;
}
export function FeedbackDetailContent({detail}:{detail:FeedbackDetail}) {
  return <><div className="feedback-detail-meta"><span>{FEEDBACK_CATEGORIES[detail.category]}</span><span className="feedback-status">{FEEDBACK_STATUSES[detail.status]}</span><time>{date.format(new Date(detail.createdAt))}</time>{detail.ownerEmail&&<span>{detail.ownerEmail}</span>}</div><p className="feedback-message">{detail.message}</p></>;
}
function FeedbackWorkspace({administrator=false}:{administrator?:boolean}) {
  const [list,setList]=useState<FeedbackList>({items:[],nextCursor:null}),[loading,setLoading]=useState(true),[moreBusy,setMoreBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[statusFilter,setStatusFilter]=useState('all'),[formOpen,setFormOpen]=useState(false);
  const [selected,setSelected]=useState<string|null>(null),[detail,setDetail]=useState<FeedbackDetail|null>(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState(''),[detailRevision,setDetailRevision]=useState(0),[image,setImage]=useState<string|null>(null),[reply,setReply]=useState(''),[replyStatus,setReplyStatus]=useState<FeedbackStatus>('open'),[replyBusy,setReplyBusy]=useState(false);
  const retry=useRef<{signature:string;key:string}|null>(null);
  const [formBusy,setFormBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();void(async()=>{setLoading(true);setError('');try{const result=await queryFeedback(administrator,null,statusFilter,controller.signal);if(!controller.signal.aborted)setList(result);}catch(e){if(!controller.signal.aborted)setError(messageOf(e));}finally{if(!controller.signal.aborted)setLoading(false);}})();return()=>controller.abort();},[administrator,statusFilter,revision]);
  useEffect(()=>{if(!selected)return;const controller=new AbortController();void(async()=>{setDetail(null);setDetailLoading(true);setDetailError('');try{const result=await getFeedback(selected,administrator,controller.signal);if(!controller.signal.aborted){setDetail(result);setReplyStatus(result.status);}}catch(e){if(!controller.signal.aborted)setDetailError(messageOf(e));}finally{if(!controller.signal.aborted)setDetailLoading(false);}})();return()=>controller.abort();},[selected,administrator,detailRevision]);
  const more=async()=>{if(moreBusy||!list.nextCursor)return;setMoreBusy(true);setError('');try{const result=await queryFeedback(administrator,list.nextCursor,statusFilter);setList(previous=>({items:[...previous.items,...result.items.filter(i=>!previous.items.some(p=>p.id===i.id))],nextCursor:result.nextCursor}));}catch(e){setError(messageOf(e));}finally{setMoreBusy(false);}};
  const respond=async()=>{
    if(!detail||replyBusy)return;
    const signature=JSON.stringify([detail.id,replyStatus,reply.trim(),detail.version]);if(retry.current?.signature!==signature)retry.current={signature,key:`feedback-reply-${crypto.randomUUID()}`};
    setReplyBusy(true);setDetailError('');try{await respondToFeedback(detail.id,replyStatus,reply.trim(),detail.version,retry.current.key);retry.current=null;setReply('');setNotice('回复与状态已保存。');setDetailRevision(v=>v+1);setRevision(v=>v+1);}catch(e){setDetailError(messageOf(e));}finally{setReplyBusy(false);}
  };
  return <section className="feedback-page" aria-label={administrator?'问题反馈管理':'我的问题反馈'}><header className="feedback-heading"><div><h1>问题反馈</h1><p>{administrator?'查看用户反馈、回复并更新处理状态':'反馈遇到的问题，查看处理状态和站长回复'}</p></div><div className="feedback-actions"><Button variant="ghost" size="icon" aria-label="刷新问题反馈" disabled={loading||moreBusy} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={17}/></Button>{!administrator&&<Button variant="ghost" onClick={()=>setFormOpen(true)}><Plus size={16}/>提交反馈</Button>}</div></header>
    {administrator&&<div className="feedback-filter"><label htmlFor="feedback-status-filter">反馈状态</label><Select value={statusFilter} onValueChange={setStatusFilter} disabled={moreBusy}><SelectTrigger id="feedback-status-filter"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem>{Object.entries(FEEDBACK_STATUSES).map(([v,label])=><SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select></div>}
    {notice&&<p className="feedback-note" role="status">{notice}</p>}{loading?<p className="feedback-state" role="status"><LoaderCircle size={17} className="animate-spin"/>正在读取反馈</p>:<><div className="feedback-list">{list.items.map(item=><button key={item.id} className="feedback-list-item" onClick={()=>{setReply('');retry.current=null;setSelected(item.id);}}><div><strong>{FEEDBACK_CATEGORIES[item.category]}</strong><span className="feedback-status">{FEEDBACK_STATUSES[item.status]}</span></div><p>{item.message.slice(0,180)}</p><footer><time>{date.format(new Date(item.updatedAt))}</time><span>{item.replyCount} 条回复</span>{item.ownerEmail&&<span>{item.ownerEmail}</span>}</footer></button>)}</div>{!list.items.length&&!error&&<p className="feedback-state">{administrator?'暂无用户反馈':'暂无问题反馈。遇到问题时，可以在这里提交。'}</p>}</>}
    {error&&<div className="feedback-error" role="alert">{error}<Button variant="ghost" onClick={()=>setRevision(v=>v+1)}>重试</Button></div>}{list.nextCursor&&!loading&&<div className="feedback-pagination"><Button variant="ghost" disabled={moreBusy} onClick={()=>void more()}>{moreBusy?'正在加载':'加载更多'}</Button></div>}
    <Sheet open={formOpen} onOpenChange={open=>{if(!formBusy)setFormOpen(open);}}><SheetContent className="feedback-sheet"><SheetHeader><SheetTitle>提交问题反馈</SheetTitle><SheetDescription>描述问题并附上相关图片，便于站长处理。</SheetDescription></SheetHeader><div className="feedback-sheet-body">{formOpen&&<FeedbackForm onBusyChange={setFormBusy} onSubmitted={id=>{setFormOpen(false);setNotice('反馈已提交，可在这里查看状态和回复。');setRevision(v=>v+1);setSelected(id);}}/>}</div></SheetContent></Sheet>
    <Sheet open={Boolean(selected)} onOpenChange={open=>{if(!replyBusy&&!open){setSelected(null);setImage(null);}}}><SheetContent className="feedback-sheet"><SheetHeader><SheetTitle>反馈详情</SheetTitle><SheetDescription>问题描述、图片和处理记录</SheetDescription></SheetHeader><div className="feedback-sheet-body">{detailLoading?<p className="feedback-state" role="status">正在读取反馈详情</p>:detail&&<><FeedbackDetailContent detail={detail}/><div className="feedback-image-tray">{detail.images.map(i=><button key={i.position} className="feedback-detail-image" aria-label={`查看问题图片${i.position}`} onClick={()=>setImage(i.url)}><img src={i.url} alt={`问题图片${i.position}`}/></button>)}</div><h2>处理记录与回复</h2>{detail.events.length?detail.events.map(e=><article className="feedback-reply" key={e.id}><header><strong>站长 · {FEEDBACK_STATUSES[e.status]}</strong><time>{date.format(new Date(e.createdAt))}</time></header>{e.message&&<p className="feedback-message">{e.message}</p>}</article>):<p className="feedback-note">暂未回复，反馈已进入待处理列表。</p>}
    {administrator&&<form className="feedback-form feedback-reply-form" onSubmit={e=>{e.preventDefault();void respond();}}><div className="feedback-field"><label htmlFor="feedback-reply-status">处理状态</label><Select value={replyStatus} onValueChange={v=>setReplyStatus(v as FeedbackStatus)} disabled={replyBusy}><SelectTrigger id="feedback-reply-status"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(FEEDBACK_STATUSES).map(([v,label])=><SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent></Select></div><div className="feedback-field"><label htmlFor="feedback-reply">回复信息</label><Textarea id="feedback-reply" rows={4} maxLength={4000} value={reply} onChange={e=>setReply(e.target.value)} disabled={replyBusy} placeholder="填写给用户的回复，也可以只更新状态。"/></div><Button type="submit" disabled={replyBusy||(!reply.trim()&&replyStatus===detail.status)}>{replyBusy?'正在保存':'保存回复与状态'}</Button></form>}</>}
    {detailError&&<div className="feedback-error" role="alert">{detailError}<Button variant="ghost" disabled={replyBusy} onClick={()=>setDetailRevision(v=>v+1)}>刷新详情</Button></div>}{detail&&!administrator&&<Button variant="ghost" onClick={()=>setDetailRevision(v=>v+1)}>刷新状态与回复</Button>}</div></SheetContent></Sheet>
    <Dialog open={Boolean(image)} onOpenChange={open=>{if(!open)setImage(null);}}><DialogContent className="feedback-image-dialog"><DialogHeader><DialogTitle>问题图片</DialogTitle><DialogDescription>反馈中提交的原始图片</DialogDescription></DialogHeader>{image&&<img src={image} alt="问题反馈原始图片"/>}</DialogContent></Dialog>
  </section>;
}
export function ProblemFeedbackView({session,onLogin}:{session:AuthenticationSession|null|undefined;onLogin:()=>void}) {
  if(session===undefined)return <p className="feedback-state" role="status">正在确认账户</p>;
  if(!session||session.preview)return <section className="feedback-state"><p>登录后提交问题反馈并查看回复。</p><Button variant="ghost" onClick={onLogin}>登录 GoodGood</Button></section>;
  return <FeedbackWorkspace key={session.user.email??'signed-in'}/>;
}
export function FeedbackManagementView(){return <FeedbackWorkspace administrator/>;}
