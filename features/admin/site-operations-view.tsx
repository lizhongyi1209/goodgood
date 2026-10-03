"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { OperationsDashboard, OperationsDetail, OperationsKind, OperationsLog } from "@/shared/contracts/site-operations";
import { readOperationsDashboard, readOperationsDetail, readOperationsLog } from "./http-operations-boundary";

export const operationLabels: Record<string,string> = { queued:"排队中", running:"生成中", refining:"整理中", succeeded:"成功", failed:"失败", cancelled:"已取消", grant:"赠送 / 入账", reserve:"预扣", settle:"结算扣费", release:"释放预扣", refund:"退款", expire:"到期", adjust:"调整", transfer_in:"划拨转入", transfer_out:"划拨转出" };
export function creditRmb(value: string) {
  const amount = BigInt(value), absolute = amount < BigInt(0) ? -amount : amount;
  return `${amount < BigInt(0) ? "-" : ""}${absolute/BigInt(100)}.${String(absolute%BigInt(100)).padStart(2,"0")}`;
}
function today() { return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date()); }
function daysBefore(date: string, days: number) { return new Date(Date.parse(date)-days*86400000).toISOString().slice(0,10); }
function dateTime(date: string) { return new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(date)); }
function errorText(error: unknown) { return error instanceof Error ? error.message : "读取失败，请稍后重试。"; }
const selectClass = "w-auto rounded-xl border-zinc-200 bg-transparent text-sm";

export function OperationsReadState({ loading, error, onRetry }: {loading: boolean; error: string; onRetry:()=>void}) {
  if (loading) return <p role="status" className="flex items-center gap-2 py-8 text-sm text-zinc-500"><LoaderCircle size={16} className="animate-spin" />正在读取运营数据</p>;
  if (error) return <div role="alert" className="py-6 text-sm"><p>{error}</p><Button variant="ghost" onClick={onRetry}>重试</Button></div>;
  return null;
}

export function OperationsDashboardContent({data,selectedDay,onSelectDay}: {data:OperationsDashboard;selectedDay:string;onSelectDay:(day:string)=>void}) {
  const day = data.days.find(item=>item.day===selectedDay);
  if (!day) return <p className="py-8 text-sm text-zinc-500">该日期暂无统计。</p>;
  const terminal = BigInt(day.succeeded)+BigInt(day.failed);
  const successRate = terminal ? `${Number(BigInt(day.succeeded)*BigInt(1000)/terminal)/10}%` : "—";
  const metrics = [
    ["创作用户",day.creators,"当日提交任务的独立用户"],
    ["新增用户",day.users,"当日注册"],
    ["当日峰值并发",day.peak ?? "暂无统计","按生成任务运行区间重叠统计"],
    ["充值金额",`¥${creditRmb(day.rechargeAmountMinor)}`,`${day.rechargeOrders} 笔已确认收款`],
    ["充值人数",day.rechargeUsers,`${day.rechargeCredits} 充值积分入账`],
    ["成功 / 失败",`${day.succeeded} / ${day.failed}`,`成功率 ${successRate} · 取消 ${day.cancelled}`],
    ["实扣积分",day.settled,`¥${creditRmb(day.settled)} · 结算时计入`],
    ["释放 / 退款",`${day.released} / ${day.refunded}`,"释放预扣 / 已结算退款积分"],
  ];
  const max = Math.max(1,...data.days.map(item=>Number(item.peak ?? 0)));
  return <>
    <div className="operations-metrics">{metrics.map(([label,value,hint])=><article key={label} className="operations-metric"><p className="text-sm text-zinc-500">{label}</p><p className="my-3 text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-zinc-400">{hint}</p></article>)}</div>
    <section className="operations-panel" aria-label="每日运营趋势">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">每日运营</h2><span className="text-xs text-zinc-500">当前生成并发 {data.concurrent} · 排队 {data.queued} · 点击日期查看当天</span></div>
      <p className="mb-4 text-xs text-zinc-400">采集于 {dateTime(data.measuredAt)}，刷新可更新。缺少可靠运行时间的历史显示“暂无统计”。</p>
      <div className="operations-trend" role="group" aria-label="每日生成任务峰值并发">{data.days.map(item=><button key={item.day} type="button" aria-label={`${item.day}，峰值并发 ${item.peak ?? "暂无统计"}`} aria-pressed={selectedDay===item.day} onClick={()=>onSelectDay(item.day)} className="operations-bar-button">
        <span className="text-[10px] text-zinc-500">{item.peak ?? "—"}</span><span className="operations-bar-track"><span className="operations-bar" style={{height:`${Number(item.peak ?? 0)/max*100}%`,minHeight:Number(item.peak)?4:0}} /></span><span className="text-[10px]">{item.day.slice(5)}</span>
      </button>)}</div>
      <div className="operations-table-wrap mt-6"><table className="operations-table"><caption className="sr-only">每日运营明细</caption><thead><tr>{["日期","创作用户","新增用户","峰值并发","充值金额","充值笔数","充值人数","充值积分","成功","失败","实扣积分","释放","退款"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{[...data.days].reverse().map(item=><tr key={item.day} className={selectedDay===item.day?"bg-primary/5":""}><td><button type="button" className="hover:text-primary" onClick={()=>onSelectDay(item.day)}>{item.day}</button></td>{[item.creators,item.users,item.peak ?? "暂无统计",`¥${creditRmb(item.rechargeAmountMinor)}`,item.rechargeOrders,item.rechargeUsers,item.rechargeCredits,item.succeeded,item.failed,item.settled,item.released,item.refunded].map((value,index)=><td key={index} className="tabular-nums">{value}</td>)}</tr>)}</tbody></table></div>
    </section>
  </>;
}

export function SiteOperationsDashboard() {
  const [end,setEnd] = useState(today), [range,setRange] = useState(7), [selected,setSelected] = useState(today);
  const [data,setData] = useState<OperationsDashboard|null>(null), [loading,setLoading] = useState(true), [error,setError] = useState(""), [reload,setReload] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return;
      setLoading(true);setError("");setData(null);setSelected(end);
      return readOperationsDashboard({from:daysBefore(end,range-1),to:end},controller.signal);
    }).then(result=>{if (result&&!controller.signal.aborted) setData(result);}).catch(failure=>{if (!controller.signal.aborted) setError(errorText(failure));}).finally(()=>{if (!controller.signal.aborted) setLoading(false);});
    return ()=>controller.abort();
  },[end,range,reload]);
  return <div className="operations-view"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-xl font-semibold">运营看板</h1><p className="mt-2 text-sm text-zinc-500">{selected} · 北京时间</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="operations-date">统计结束日期</label><Input className="w-auto" id="operations-date" type="date" value={end} max={today()} onChange={event=>{if(event.target.value)setEnd(event.target.value);}} /><Select value={String(range)} onValueChange={value=>setRange(Number(value))}><SelectTrigger className={selectClass} aria-label="趋势范围"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="7">近 7 天</SelectItem><SelectItem value="30">近 30 天</SelectItem></SelectContent></Select><Button variant="ghost" size="icon" aria-label="刷新运营看板" disabled={loading} onClick={()=>setReload(value=>value+1)}><RefreshCw size={16}/></Button></div></div>
    <OperationsReadState loading={loading} error={error} onRetry={()=>setReload(value=>value+1)}/>
    {!loading&&!error&&data&&<OperationsDashboardContent data={data} selectedDay={selected} onSelectDay={setSelected}/>}
    <p className="mt-5 text-xs leading-6 text-zinc-400">仅统计已持久化的图片任务及个人、企业积分账本。成功 / 失败按完成日期统计；积分按结算日期统计，100 积分 = 1 元，金额为积分等值。</p>
  </div>;
}

export function OperationsLogContent({data,kind,onOpen}: {data:OperationsLog;kind:OperationsKind;onOpen:(id:string)=>void}) {
  if (!data.items.length) return <p className="py-12 text-center text-sm text-zinc-500">没有符合条件的记录</p>;
  return <div className="operations-table-wrap"><table className="operations-table"><caption className="sr-only">{kind==="tasks"?"任务记录":"积分流水"}</caption><thead><tr>{["时间","用户 / 资金来源",kind==="tasks"?"模型 / 规格":"事件",kind==="tasks"?"状态":"积分记录量","关联标识",""].map((label,index)=><th key={index}>{label}</th>)}</tr></thead><tbody>{data.items.map(item=>{
    const task = "state" in item ? item : null, credit = "type" in item ? item : null;
    return <tr key={item.id}><td className="whitespace-nowrap">{dateTime(item.createdAt)}</td><td><div className="break-all">{item.email??"企业资金池"}</div><p className="mt-1 text-xs text-zinc-400">{item.fund==="organization"?item.fundName:"个人积分"}</p></td><td>{task?<><p>{task.model}</p><p className="mt-1 text-xs text-zinc-400">{task.resolution} · {task.count} 张 · {task.aspectRatio}</p></>:operationLabels[credit!.type]??credit!.type}</td><td>{task?<span className={task.state==="failed"?"text-primary":""}>{operationLabels[task.state]??task.state}</span>:<><span className="tabular-nums">{credit!.credits}</span><p className="mt-1 text-xs text-zinc-400">¥{creditRmb(credit!.credits)}</p></>}</td><td className="max-w-56 break-all font-mono text-xs text-zinc-500">{task?.id??credit?.jobId??item.id}</td><td><Button variant="ghost" aria-label={`查看记录 ${item.id}`} onClick={()=>onOpen(item.id)}>详情</Button></td></tr>;
  })}</tbody></table></div>;
}

function OperationsFailureDiagnostics({data}: {data:OperationsDetail}) {
  const events = data.diagnostics ?? [];
  if (!events.length && data.job?.state !== "failed") return null;
  const phases:Record<string,string> = {submission:"提交生成请求", "reference-upload":"上传参考素材", "task-poll":"查询生成任务", "output-download":"下载生成结果", "provider-request":"请求生成服务"};
  const stages:Record<string,string> = {"attempt-validation":"校验任务", "provider-submission":"提交任务", "provider-poll":"等待生成结果", "output-storage":"保存生成结果", "generation-completion":"完成任务"};
  const reasons:Record<string,string> = {
    "http-error":"HTTP 请求失败", "invalid-json":"上游响应不是有效 JSON",
    "invalid-task-response":"无法读取上游生成结果；此记录未保存具体异常字段，无法确定是否返回了 base64",
    "invalid-upload-response":"素材上传响应不符合约定", "missing-task-id":"上游未返回任务 ID",
    "upstream-task-failed":"上游任务生成失败", "network-error":"网络请求失败",
    "poll-timeout":"等待生成结果超时", "output-error":"生成结果无法处理",
    "task-id-invalid":"上游响应缺少有效任务 ID（task_id）",
    "task-status-invalid":"上游任务状态缺失或无法识别（status）",
    "task-images-invalid":"上游图片列表格式错误（data.images 应为数组）",
    "task-image-count-mismatch":"上游声明生成成功，但返回的图片数量不符合请求要求",
    "task-image-base64":"上游返回了 base64 图片数据，未提供可下载的图片链接；当前接口只接受图片 URL",
    "task-image-url-missing":"上游图片结果缺少可下载链接（url）",
    "task-image-url-invalid":"上游图片链接不是有效 URL（url）",
    "task-image-url-unsupported":"上游图片链接协议不受支持；需要 HTTPS 链接，本地测试仅允许回环 HTTP",
    "task-image-mime-invalid":"上游图片类型缺失或不是图片（mime_type 应为 image/*）",
    "task-state-images-mismatch":"上游任务尚未成功，却已返回图片结果，任务状态与结果冲突",
  };
  return <section aria-label="失败诊断"><h3 className="mb-4 font-medium">失败诊断</h3>
    {events.length ? <ol className="space-y-4">{events.map(event => {
      const d = event.diagnostic;
      const fields:[string,string|number|undefined][] = [
        ["发生阶段", d.phase ? phases[d.phase] ?? d.phase : d.stage ? stages[d.stage] ?? d.stage : undefined],
        ["失败原因", d.reason ? reasons[d.reason] ?? d.reason : undefined],
        ["错误代码", d.code], ["HTTP 状态", d.httpStatus],
        ["异常图片", d.outputOrdinal === undefined ? undefined : `第 ${d.outputOrdinal} 张`],
        ["请求图片数量", d.expectedOutputCount], ["返回图片数量", d.actualOutputCount],
        ["请求耗时", d.durationMs === undefined ? undefined : `${d.durationMs} ms`],
        ["请求地址", d.endpoint ? `${d.method ?? ""} ${d.endpoint}`.trim() : undefined],
        ["上游请求 ID", d.upstreamRequestId], ["上游任务 ID", d.upstreamTaskId],
        ["上游错误代码", d.upstreamCode],
        ["网络原因", [d.networkName,d.networkCode].filter(Boolean).join(" · ") || undefined],
        ["服务 / 模型", [d.provider,d.providerModel].filter(Boolean).join(" · ") || undefined],
        ["路由版本", d.routeVersion], ["尝试 ID", d.attemptId],
      ];
      return <li key={event.id} className="rounded-xl border border-zinc-200/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><span>{d.ordinal ? `第 ${d.ordinal} 次尝试 · ` : ""}{event.type === "provider_fallback" ? "主渠道失败，切换备用" : "请求失败"}</span><time className="text-xs text-zinc-500" dateTime={event.createdAt}>{dateTime(event.createdAt)}</time></div>
        <dl className="operations-detail-fields mt-4 text-xs">{fields.flatMap(([label,value]) => value === undefined ? [] : [<Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>])}</dl>
        {d.upstreamMessage && <div className="mt-4"><p className="mb-2 text-xs text-zinc-500">上游错误信息</p><p className="whitespace-pre-wrap break-words text-xs leading-5 [overflow-wrap:anywhere]">{d.upstreamMessage}</p></div>}
      </li>;
    })}</ol> : <p className="text-xs text-zinc-500">此任务未记录详细诊断，仅保留错误代码。</p>}
  </section>;
}

export function OperationsDetailContent({data}: {data:OperationsDetail}) {
  const {job,selected,timeline} = data;
  const settled = timeline.filter(item=>item.type==="settle").reduce((sum,item)=>sum-BigInt(item.credits),BigInt(0));
  const refunded = timeline.filter(item=>item.type==="refund").reduce((sum,item)=>sum+BigInt(item.credits),BigInt(0));
  const lines:Record<string,string> = {special:"特价",quality:"优质",dedicated:"专线"};
  const qualities:Record<string,string> = {auto:"自动",low:"低",medium:"中",high:"高",xhigh:"xhigh",max:"max"};
  return <div className="space-y-6 text-sm">
    <dl className="operations-detail-fields">{job?<>
      <dt>用户</dt><dd>{job.email}</dd><dt>资金来源</dt><dd>{job.fund==="organization"?job.fundName:"个人积分"}</dd>
      <dt>任务 ID</dt><dd className="font-mono text-xs">{job.id}</dd><dt>批次 ID</dt><dd className="font-mono text-xs">{job.batchId}</dd>
      <dt>模型 / 线路</dt><dd>{job.model} · {job.line?lines[job.line]??job.line:"历史线路"}</dd>
      <dt>参数</dt><dd>{job.resolution} · {job.aspectRatio} · {job.count} 张 · 质量 {job.quality?qualities[job.quality]??job.quality:"默认"}</dd>
      <dt>状态</dt><dd>{operationLabels[job.state]??job.state}</dd><dt>提交 / 完成</dt><dd>{dateTime(job.createdAt)} / {job.completedAt?dateTime(job.completedAt):"—"}</dd>
      <dt>提交报价</dt><dd>{job.quote??"未记录"} 积分{job.quote?` · ¥${creditRmb(job.quote)}`:""}</dd>
      <dt>最终实扣</dt><dd>{String(settled-refunded)} 积分 · ¥{creditRmb(String(settled-refunded))}{!timeline.some(item=>["settle","release"].includes(item.type))?"（尚未结算）":""}</dd>
      {job.errorCode&&<><dt>错误代码</dt><dd className="font-mono text-xs">{job.errorCode}</dd></>}
    </>:selected&&<><dt>用户</dt><dd>{selected.email??"企业资金池"}</dd><dt>资金来源</dt><dd>{selected.fundName??"个人积分"}</dd></>}
    </dl>
    <OperationsFailureDiagnostics data={data}/>
    <section><h3 className="mb-4 font-medium">积分流水</h3><p className="mb-4 text-xs leading-5 text-zinc-400">预扣先冻结积分，结算确认消耗；两条记录只算一次实扣。释放归还预扣，退款归还已结算积分。</p>
      {(timeline.length?timeline:selected?[selected]:[]).length?<ol className="space-y-4">{(timeline.length?timeline:[selected!]).map(item=><li key={item.id} className="rounded-xl border border-zinc-200/70 p-4"><div className="flex items-center justify-between gap-3"><span>{operationLabels[item.type]??item.type}</span><span className="tabular-nums">{item.credits} 积分</span></div><p className="mt-2 text-xs text-zinc-500">{dateTime(item.createdAt)} · {item.fundName??"个人积分"}</p><p className="mt-2 break-all font-mono text-[11px] text-zinc-400">记录 {item.id}{item.priorId&&<> · 前序 {item.priorId}</>}</p></li>)}</ol>:<p className="text-zinc-500">未发现关联积分流水</p>}
    </section>
  </div>;
}

export function SiteOperationsLog() {
  const [kind,setKind] = useState<OperationsKind>("tasks"),[query,setQuery] = useState(""),[from,setFrom] = useState(()=>daysBefore(today(),29)),[to,setTo] = useState(today),[filter,setFilter] = useState("");
  const [request,setRequest] = useState({kind:"tasks" as OperationsKind,query:"",from:daysBefore(today(),29),to:today(),filter:"",cursor:null as string|null});
  const [data,setData] = useState<OperationsLog|null>(null),[loading,setLoading] = useState(true),[error,setError] = useState(""),[reload,setReload] = useState(0),[page,setPage] = useState(1);
  const [opened,setOpened] = useState<{kind:OperationsKind;id:string}|null>(null),[detail,setDetail] = useState<OperationsDetail|null>(null),[detailError,setDetailError] = useState(""),[detailLoading,setDetailLoading] = useState(false),[detailReload,setDetailReload] = useState(0);
  const focus = useRef<HTMLElement|null>(null);
  useEffect(()=>{const controller=new AbortController();
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return;
      setLoading(true);setError("");setData(null);
      return readOperationsLog(request,controller.signal);
    }).then(result=>{if(result&&!controller.signal.aborted)setData(result);}).catch(failure=>{if(!controller.signal.aborted)setError(errorText(failure));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[request,reload]);
  useEffect(()=>{if(!opened)return;const controller=new AbortController();
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return;
      setDetailLoading(true);setDetail(null);setDetailError("");
      return readOperationsDetail(opened,controller.signal);
    }).then(result=>{if(result&&!controller.signal.aborted)setDetail(result);}).catch(failure=>{if(!controller.signal.aborted)setDetailError(errorText(failure));}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});return()=>controller.abort();
  },[opened,detailReload]);
  function search(nextKind=kind) {setPage(1);setRequest({kind:nextKind,query,from,to,filter:nextKind===kind?filter:"",cursor:null});}
  const options = kind==="tasks"?["queued","running","refining","succeeded","failed","cancelled"]:["grant","reserve","settle","release","refund","expire","adjust","transfer_in","transfer_out"];
  return <div className="operations-view"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-xl font-semibold">总日志</h1><p className="mt-2 text-sm text-zinc-500">查找用户任务、扣费与退款记录</p></div><Button variant="ghost" size="icon" disabled={loading} aria-label="刷新总日志" onClick={()=>setReload(value=>value+1)}><RefreshCw size={16}/></Button></div>
    <div className="mb-4 flex gap-2" role="group" aria-label="日志类型">{(["tasks","credits"] as const).map(value=><Button key={value} variant="ghost" aria-pressed={kind===value} className={kind===value?"bg-primary/5 text-primary":"text-zinc-500"} onClick={()=>{setKind(value);setFilter("");search(value);}}>{value==="tasks"?"任务记录":"积分流水"}</Button>)}</div>
    <form className="operations-filters mb-5" onSubmit={event=>{event.preventDefault();search();}}><div className="relative min-w-0 flex-1"><Search size={15} aria-hidden className="absolute left-3 top-3 text-zinc-400"/><Input className="pl-9" aria-label="搜索邮箱、任务或批次 ID" placeholder="邮箱、任务或批次 ID" maxLength={100} value={query} onChange={event=>setQuery(event.target.value)}/></div><label className="flex items-center gap-2 text-xs text-zinc-500">开始<Input className="w-auto" aria-label="日志开始日期" type="date" required value={from} max={to} onChange={event=>setFrom(event.target.value)}/></label><label className="flex items-center gap-2 text-xs text-zinc-500">结束<Input className="w-auto" aria-label="日志结束日期" type="date" required value={to} min={from} max={today()} onChange={event=>setTo(event.target.value)}/></label><Select value={filter||"all"} onValueChange={value=>setFilter(value==="all"?"":value)}><SelectTrigger className={selectClass} aria-label="日志状态或事件"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">{kind==="tasks"?"全部状态":"全部事件"}</SelectItem>{options.map(value=><SelectItem key={value} value={value}>{operationLabels[value]}</SelectItem>)}</SelectContent></Select><Button type="submit" variant="ghost" disabled={loading}>查询</Button></form>
    <OperationsReadState loading={loading} error={error} onRetry={()=>setReload(value=>value+1)}/>
    {!loading&&!error&&data&&<><OperationsLogContent data={data} kind={request.kind} onOpen={id=>{focus.current=document.activeElement as HTMLElement;setOpened({kind:request.kind,id});}}/><div className="mt-4 flex items-center justify-end gap-3 text-xs text-zinc-500"><span>第 {page} 页 · {data.items.length} 条</span><Button variant="ghost" disabled={page===1} onClick={()=>{setPage(1);setRequest({...request,cursor:null});}}>回到首页</Button><Button variant="ghost" disabled={!data.nextCursor} onClick={()=>{setPage(value=>value+1);setRequest({...request,cursor:data.nextCursor});}}>下一页</Button></div></>}
    <p className="mt-4 text-xs text-zinc-400">北京时间 · 最多查询 90 天 · 仅包含已持久化记录；账户操作请查看审计日志。</p>
    <Sheet open={!!opened} onOpenChange={open=>{if(!open)setOpened(null);}}><SheetContent side="right" showCloseButton={false} className="w-full gap-0 border-zinc-200 p-0 shadow-none sm:max-w-[640px]" onCloseAutoFocus={event=>{event.preventDefault();focus.current?.focus();}}><SheetHeader className="border-b border-zinc-200 p-6 pr-16"><SheetTitle>记录详情</SheetTitle><SheetDescription>关联任务、失败诊断与积分账本</SheetDescription><SheetClose asChild><Button variant="ghost" size="icon" className="absolute right-4 top-4" aria-label="关闭记录详情"><X size={16}/></Button></SheetClose></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto p-6"><OperationsReadState loading={detailLoading} error={detailError} onRetry={()=>setDetailReload(value=>value+1)}/>{!detailLoading&&!detailError&&detail&&<OperationsDetailContent data={detail}/>}</div></SheetContent></Sheet>
  </div>;
}
