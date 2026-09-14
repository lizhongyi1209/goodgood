"use client";

import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {Camera,Images,LoaderCircle,Pencil,RefreshCw,UserRound,X} from 'lucide-react';
import {goodGoodApiFetch} from '@/features/auth/http-auth-boundary';
import {PrivateObjectImage} from '@/components/ui/private-object-image';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import {uploadReferenceFiles} from '@/features/references/http-reference-upload';
import {listReferenceMaterials} from '@/features/references/http-reference-library';

export type PersonalProfile={displayName:string;handle:string|null;avatarReferenceId:string|null;avatarUrl:string|null;version:number};
type ProfileInput=Omit<PersonalProfile,'avatarUrl'|'handle'> & {handle:string};
async function profileRequest(input?:ProfileInput):Promise<PersonalProfile> {
 const response=await goodGoodApiFetch('/api/profile',{cache:'no-store',...(input?{method:'PATCH',headers:{'content-type':'application/json','x-goodgood-profile-action':'1'},body:JSON.stringify(input)}:{})});
 const payload=await response.json() as PersonalProfile & {error?:{message?:string}};
 if(!response.ok) throw new Error(payload.error?.message??'个人资料暂时不可用，请重试。');
 return payload;
}
export function usePersonalProfile(accountKey:string|null) {
 const [record,setRecord]=useState<{key:string;profile:PersonalProfile}|null>(null);
 const [failure,setFailure]=useState<{key:string;message:string}|null>(null);
 const [revision,setRevision]=useState(0);
 const keyRef=useRef(accountKey);
 useEffect(()=>{keyRef.current=accountKey;},[accountKey]);
 useEffect(()=>{
  if(!accountKey) return;
  let active=true;
  void profileRequest().then(profile=>{if(active) {setRecord({key:accountKey,profile});setFailure(null);}}).catch(error=>{if(active) setFailure({key:accountKey,message:error instanceof Error?error.message:'个人资料暂时不可用。'});});
  return ()=>{active=false;};
 },[accountKey,revision]);
 const profile=record?.key===accountKey?record.profile:null;
 const error=failure?.key===accountKey?failure.message:null;
 const reload=useCallback(()=>{setRecord(null);setFailure(null);setRevision(current=>current+1);},[]);
 const save=async(input:ProfileInput)=>{const key=accountKey;const value=await profileRequest(input);if(key && keyRef.current===key) {setRecord({key,profile:value});setFailure(null);}return value;};
 return {profile,error,loading:Boolean(accountKey&&!profile&&!error),reload,save};
}

export function ProfileAvatar({url,name,className=''}:{url?:string|null;name:string;className?:string}) {
 return <span className={`profile-avatar ${className}`}>{url?<PrivateObjectImage src={url} alt={`${name}的头像`} loading="eager"/>:<UserRound aria-hidden="true" size={28}/>}</span>;
}
export function ProfileReadState({loading,error,onRetry}:{loading:boolean;error?:string|null;onRetry:()=>void}) {
 return <div className="profile-read-state" role={error?'alert':'status'}>{loading?<><LoaderCircle size={18}/>正在读取个人资料</>:<>{error}<button onClick={onRetry}><RefreshCw size={15}/>重试</button></>}</div>;
}
export type ProfileWork={key:string;url:string;ratio:number;alt:string};
export function ProfileWorks({works,loading,error,onRetry,onOpen,onCreate}:{works:readonly ProfileWork[];loading:boolean;error?:string|null;onRetry:()=>void;onOpen:(key:string)=>void;onCreate:()=>void}) {
 return <section className="profile-works" aria-label="我的作品"><header><h2>我的作品</h2>{!loading&&!error&&<span>{works.length} 张图片</span>}</header>
  {loading?<div className="profile-read-state" role="status"><LoaderCircle size={18}/>正在读取作品</div>:error?<div className="profile-read-state" role="alert">{error}<button onClick={onRetry}><RefreshCw size={15}/>重试</button></div>:works.length===0?<div className="profile-empty"><Images size={24}/><strong>还没有图片作品</strong><p>完成创作后，你的图片会出现在这里。</p><button onClick={onCreate}>开始创作</button></div>:<div className="profile-work-grid">{works.map((work,index)=><button key={work.key} className="profile-work" style={{aspectRatio:work.ratio}} aria-label={`查看我的作品 ${index+1}`} onClick={()=>onOpen(work.key)}><PrivateObjectImage src={work.url} alt={work.alt}/></button>)}</div>}
 </section>;
}
export function PersonalProfileView({state,works,worksLoading,worksError,onRetryWorks,onOpenWork,onCreate}:{state:ReturnType<typeof usePersonalProfile>;works:readonly ProfileWork[];worksLoading:boolean;worksError:string|null;onRetryWorks:()=>void;onOpenWork:(key:string)=>void;onCreate:()=>void}) {
 const [open,setOpen]=useState(false);
 const [name,setName]=useState('');const [handle,setHandle]=useState('');
 const [avatarId,setAvatarId]=useState<string|null>(null);const [avatarUrl,setAvatarUrl]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [uploading,setUploading]=useState(false);
 const [saved,setSaved]=useState(false);const fileRef=useRef<HTMLInputElement>(null);const uploadRef=useRef(0);
 useEffect(()=>()=>{uploadRef.current+=1;},[]);
 const profile=state.profile;
 function changeOpen(next:boolean) {
  if(busy||uploading) return;
  if(next&&profile) {setName(profile.displayName);setHandle(profile.handle??'');setAvatarId(profile.avatarReferenceId);setAvatarUrl(profile.avatarUrl);setError(null);setSaved(false);}
  setOpen(next);
 }
 async function upload(file:File) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024) {setError('请选择不超过 20 MB 的 JPG、PNG 或 WebP 图片。');return;}
  const request=++uploadRef.current;setUploading(true);setError(null);
  try {
   const [reference]=await uploadReferenceFiles([{clientId:crypto.randomUUID(),file}],()=>{},null);
   if(reference.reference.status!=='ready') throw new Error(reference.reference.errorMessage??'头像上传失败，请重新选择图片。');
   const material=(await listReferenceMaterials(null)).find(item=>item.id===reference.reference.id);
   if(!material) throw new Error('头像暂时不可用，请重新上传。');
   if(uploadRef.current===request) {setAvatarId(material.id);setAvatarUrl(material.url);}
  } catch(failure) {if(uploadRef.current===request) setError(failure instanceof Error?failure.message:'头像上传失败。');}
  finally {if(uploadRef.current===request) setUploading(false);}
 }
 async function submit(event:FormEvent) {
  event.preventDefault();if(!profile||busy||uploading) return;
  const value=handle.trim().replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_]{3,24}$/.test(value)) {setError('用户名需为 3–24 位字母、数字或下划线。');return;}
  if(!name.trim()||Array.from(name.trim()).length>30) {setError('名称需为 1–30 个字符。');return;}
  setBusy(true);setError(null);
  try {await state.save({displayName:name.trim(),handle:value,avatarReferenceId:avatarId,version:profile.version});setOpen(false);setSaved(true);} catch(failure) {setError(failure instanceof Error?failure.message:'保存失败，请重试。');} finally {setBusy(false);}
 }
 return <section className="personal-profile-view" aria-label="个人资料"><h1 className="profile-page-title">个人资料</h1>
  {!profile?<ProfileReadState loading={state.loading} error={state.error} onRetry={state.reload}/>:<header className="profile-heading"><ProfileAvatar url={profile.avatarUrl} name={profile.displayName}/><div className="profile-identity"><h2>{profile.displayName}</h2><p>{profile.handle?`@${profile.handle}`:'设置你的 @用户名'}</p><span>仅自己可见</span></div>
   <Sheet open={open} onOpenChange={changeOpen}><SheetTrigger asChild><button className="profile-edit-button"><Pencil size={15}/>编辑资料</button></SheetTrigger><SheetContent className="profile-editor-sheet" showCloseButton={false} onEscapeKeyDown={event=>{if(busy||uploading) event.preventDefault();}} onInteractOutside={event=>{if(busy||uploading) event.preventDefault();}}><SheetHeader><SheetTitle>编辑个人资料</SheetTitle><SheetDescription>设置名称、用户名和头像。</SheetDescription></SheetHeader><button className="profile-sheet-close" aria-label="关闭编辑资料" disabled={busy||uploading} onClick={()=>changeOpen(false)}><X size={18}/></button>
    <form onSubmit={event=>void submit(event)}><div className="profile-avatar-editor"><ProfileAvatar url={avatarUrl} name={name||'我'}/><div><button type="button" disabled={busy||uploading} onClick={()=>fileRef.current?.click()}>{uploading?<LoaderCircle size={16}/>:<Camera size={16}/>}更换头像</button>{avatarId&&<button type="button" disabled={busy||uploading} onClick={()=>{setAvatarId(null);setAvatarUrl(null);}}>移除头像</button>}</div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="上传头像" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file) void upload(file);}}/></div><p className="profile-field-hint">JPG、PNG 或 WebP，最大 20 MB。头像会居中裁切。</p>
     <label htmlFor="profile-name">名称</label><input id="profile-name" value={name} disabled={busy||uploading} autoComplete="nickname" onChange={event=>setName(event.target.value)} aria-describedby="profile-name-hint"/><p id="profile-name-hint" className="profile-field-hint">1–30 个字符</p>
     <label htmlFor="profile-handle">用户名</label><div className="profile-handle-input"><span aria-hidden="true">@</span><input id="profile-handle" value={handle} disabled={busy||uploading} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={event=>setHandle(event.target.value)} aria-describedby="profile-handle-hint"/></div><p id="profile-handle-hint" className="profile-field-hint">3–24 位字母、数字或下划线，不能与其他用户重复。</p>
     {error&&<div className="profile-save-error" role="alert">{error}{error.includes('其他页面')&&<button type="button" onClick={()=>{setOpen(false);state.reload();}}>重新读取资料</button>}</div>}
     <footer><button type="button" disabled={busy||uploading} onClick={()=>changeOpen(false)}>取消</button><button type="submit" disabled={busy||uploading}>{busy?<><LoaderCircle size={15}/>保存中</>:'保存资料'}</button></footer>
    </form></SheetContent></Sheet>
  </header>}
  {saved&&<p className="profile-saved" role="status">资料已保存</p>}
  <ProfileWorks works={works} loading={worksLoading} error={worksError} onRetry={onRetryWorks} onOpen={onOpenWork} onCreate={onCreate}/>
 </section>;
}
