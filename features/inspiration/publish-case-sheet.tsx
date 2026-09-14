"use client";
import {useEffect,useState} from 'react';
import {LoaderCircle,X} from 'lucide-react';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Checkbox} from '@/components/ui/checkbox';
import {CaseComparison,CaseParametersList,InspirationReadState} from './inspiration-board';
import {inspirationRequest,type CasePreparation,type InspirationCase} from './http-inspiration-boundary';

export function PublishCaseSheet({assetId,onClose,onPublished}:{assetId:string|null;onClose:()=>void;onPublished:(value:InspirationCase)=>void}) {
  const [prepared,setPrepared]=useState<CasePreparation|null>(null);const [error,setError]=useState<string|null>(null);const [revision,setRevision]=useState(0);
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [beforeId,setBeforeId]=useState('');const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!assetId) return;let active=true;
    void inspirationRequest<CasePreparation>('/prepare',{assetId}).then(value=>{if(active) {setPrepared(value);setError(null);setTitle('');setDescription('');setBeforeId(value.beforeOptions[0]?.id??'');setConsent(false);}}).catch(failure=>{if(active) setError(failure instanceof Error?failure.message:'作品暂时无法分享。');});
    return ()=>{active=false;};
  },[assetId,revision]);
  const current=prepared?.assetId===assetId?prepared:null;
  function close() {setPrepared(null);setError(null);setConsent(false);onClose();}
  async function publish() {
    if(!current||!consent||busy) return;setBusy(true);setError(null);
    try {const value=await inspirationRequest<InspirationCase>('',{assetId:current.assetId,beforeReferenceId:beforeId||null,title:title.trim(),description:description.trim(),consent:true});onPublished(value);close();} catch(failure) {setError(failure instanceof Error?failure.message:'分享失败，请重试。');} finally {setBusy(false);}
  }
  return <Sheet open={Boolean(assetId)} onOpenChange={value=>{if(!value&&!busy) close();}}><SheetContent className="case-detail-sheet case-publish-sheet" showCloseButton={false} onEscapeKeyDown={event=>{if(busy) event.preventDefault();}} onInteractOutside={event=>{if(busy) event.preventDefault();}}><SheetHeader><SheetTitle>分享作品为案例</SheetTitle><SheetDescription>选中的图片、提示词、参数和署名将向站内用户展示。</SheetDescription></SheetHeader><button className="case-sheet-close" aria-label="关闭分享作品" disabled={busy} onClick={close}><X size={18}/></button>
    {!current?<InspirationReadState loading={!error} error={error} onRetry={()=>{setPrepared(null);setError(null);setRevision(value=>value+1);}}/>:<form className="case-publish-form" onSubmit={event=>{event.preventDefault();void publish();}}><label htmlFor="case-title">案例名称</label><input id="case-title" value={title} placeholder="例如：高清放大图片" maxLength={60} required disabled={busy} onChange={event=>setTitle(event.target.value)}/><label htmlFor="case-description">效果说明 <span>选填</span></label><textarea id="case-description" rows={2} value={description} maxLength={1000} disabled={busy} onChange={event=>setDescription(event.target.value)}/>
      {current.beforeOptions.length>0&&<><label htmlFor="case-before">处理前图片</label><select id="case-before" value={beforeId} disabled={busy} onChange={event=>setBeforeId(event.target.value)}><option value="">不展示对比原图</option>{current.beforeOptions.map((item,index)=><option key={item.id} value={item.id}>参考图 {index+1} · {item.name}</option>)}</select><p className="case-field-hint">只会分享选中的原图，其余参考素材保持私有。</p></>}
      <CaseComparison before={current.beforeOptions.find(item=>item.id===beforeId)??null} after={current.after} title={title||'我的案例'}/><section><h3>提示词</h3><p className="case-prompt">{current.prompt}</p></section><section><h3>原作参数</h3><CaseParametersList parameters={current.parameters}/></section><p className="case-public-author">署名：{current.author.displayName}{current.author.handle?` · @${current.author.handle}`:''}{current.author.avatarUrl?' · 个人头像':''}</p>
      <label className="case-consent" htmlFor="case-consent"><Checkbox id="case-consent" checked={consent} disabled={busy} onCheckedChange={value=>setConsent(value===true)}/><span>我确认分享上述图片、提示词、参数和署名，允许站内用户查看和复用。</span></label>{error&&<div className="inspiration-action-error" role="alert">{error}</div>}<footer><button type="button" disabled={busy} onClick={close}>取消</button><button className="case-use" type="submit" disabled={busy||!consent||!title.trim()}>{busy?<><LoaderCircle size={16}/>分享中</>:'分享到灵感板'}</button></footer>
    </form>}
  </SheetContent></Sheet>;
}
