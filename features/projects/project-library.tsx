"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, FolderOpen, LoaderCircle, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ProjectRecord } from "@/shared/contracts/project";
import { deleteProject, renameProject } from "./http-project-boundary";
import { CanvasProjectPreview } from "./canvas-project-preview";
import type { CanvasProjectListItem } from "./canvas-project-index";
import { formatProjectUpdated, projectNameError } from "./project-library-model.mjs";
import { removeCanvasProjectFromLibrary, renameCanvasProjectFromLibrary } from "./project-management";
import styles from "./project-library.module.css";

type Target = { kind: "canvas" | "creative"; id: string; name: string; action: "rename" | "delete" };
type Props = {
  projects: readonly ProjectRecord[]; canvasProjects: readonly CanvasProjectListItem[];
  ownerKey: string; workspaceId: string | null; loading: boolean; error: string | null;
  restoringId: string | null; busyProjectId: string | null;
  onRetry: () => void; onCreate: () => void; onRestore: (project: ProjectRecord) => void;
  onProjectUpdated: (project: Pick<ProjectRecord, "id" | "name" | "updatedAt">) => void;
  onProjectDeleted: (id: string) => void;
  onCanvasUpdated: (project: CanvasProjectListItem) => void;
  onCanvasDeleted: (id: string) => void;
};

function ProjectMenu({ name, disabled, onAction }: { name: string; disabled: boolean; onAction: (action: "rename" | "delete") => void }) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className={styles.menuTrigger} disabled={disabled} aria-label={`管理项目 ${name}`}><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
    <DropdownMenuContent className={styles.menuContent} align="end"><DropdownMenuItem onSelect={() => onAction("rename")}><Pencil size={14} />重命名</DropdownMenuItem><DropdownMenuItem onSelect={() => onAction("delete")}><Trash2 size={14} />删除</DropdownMenuItem></DropdownMenuContent>
  </DropdownMenu>;
}

export function ProjectLibrary(props: Props) {
  const [target, setTarget] = useState<Target | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const openAction = (next: Target) => { setTarget(next); setName(next.name); setOperationError(null); };
  const close = () => { if (!pending) { setTarget(null); setOperationError(null); } };
  const confirm = async () => {
    if (!target || pending || props.loading) return;
    const maximum = target.kind === "canvas" ? 20 : 32;
    const invalid = target.action === "rename" ? projectNameError(name, maximum) : null;
    if (invalid) { setOperationError(invalid); return; }
    const project = target.kind === "canvas" ? props.canvasProjects.find((item) => item.id === target.id) : props.projects.find((item) => item.id === target.id);
    if (!project) { setOperationError("项目已不在当前列表，请刷新后重试。"); return; }
    if (target.kind === "creative" && (props.busyProjectId === target.id || props.restoringId === target.id)) return;
    const isCurrent = () => mountedRef.current;
    setPending(true); setOperationError(null); setWarning(null);
    try {
      if (target.kind === "canvas") {
        if (target.action === "rename") {
          const result = await renameCanvasProjectFromLibrary(project as CanvasProjectListItem, name.trim(), props.ownerKey);
          if (!isCurrent()) return;
          props.onCanvasUpdated(result.project); setWarning(result.cacheWarning);
        } else {
          const result = await removeCanvasProjectFromLibrary(project as CanvasProjectListItem, props.ownerKey);
          if (!isCurrent()) return;
          props.onCanvasDeleted(target.id); setWarning(result.cacheWarning);
        }
      } else if (target.action === "rename") {
        const result = await renameProject(target.id, name.trim(), props.workspaceId);
        if (!isCurrent()) return;
        props.onProjectUpdated(result);
      } else {
        await deleteProject(target.id, props.workspaceId);
        if (!isCurrent()) return;
        props.onProjectDeleted(target.id);
      }
      if (isCurrent()) setTarget(null);
    } catch (failure) {
      if (isCurrent()) setOperationError(failure instanceof Error ? failure.message : "项目操作未完成，请重试。");
    } finally { if (isCurrent()) setPending(false); }
  };
  return <section className={`project-library-view ${styles.library}`} aria-label="项目">
    <header className="asset-library-header project-library-header"><div><h1>项目</h1><p>保存完整的创作过程，随时恢复并继续创作。</p></div><button type="button" className="new-creation-button" onClick={props.onCreate}><Plus size={16} />新建创作</button></header>
    {props.loading ? <div className="project-library-state" role="status"><LoaderCircle size={18} />正在读取项目</div>
      : props.projects.length === 0 && props.canvasProjects.length === 0 && !props.error ? <div className="project-library-state project-library-empty"><FolderOpen size={20} /><strong>还没有保存的项目</strong><span>打开画布或完成创作后，项目会出现在这里。</span></div>
        : <>
          {props.error && <div className="project-library-state project-library-error" role="alert"><CircleAlert size={18} /><span>{props.error}</span><button type="button" onClick={props.onRetry}><RefreshCw size={14} />重试</button></div>}
          <div className={`project-grid ${styles.grid}`}>
            {props.canvasProjects.map((project) => <article className={`project-card ${styles.card}`} key={`canvas-${project.id}`} data-disabled={pending || undefined}>
              <a className={styles.cardEntry} href={pending ? undefined : `/canvas/${encodeURIComponent(project.id)}`} aria-label={`打开画布项目 ${project.name}`} aria-disabled={pending || undefined} tabIndex={pending ? -1 : undefined} />
              <div className="project-cover canvas-project-cover"><CanvasProjectPreview project={project} ownerKey={props.ownerKey} /></div>
              <div className="project-card-footer"><div><h2>{project.name}</h2><p>{formatProjectUpdated(project.updatedAt)}</p></div><div className={styles.actions}>
                <ProjectMenu name={project.name} disabled={pending} onAction={(action) => openAction({ kind: "canvas", id: project.id, name: project.name, action })} />
              </div></div>
              {(project.localOnly || project.localDirty) && <span className="project-local-status">{project.localOnly ? "仅本地 · 等待同步" : "等待同步"}</span>}
            </article>)}
            {props.projects.map((project) => {
              const images = project.batches.filter((batch) => batch.state === "succeeded").flatMap((batch) => batch.outputs);
              const cover = images[0]; const restoring = props.restoringId === project.id;
              return <article className={`project-card ${styles.card}`} key={`creative-${project.id}`} data-disabled={restoring || pending || undefined} aria-busy={restoring || undefined}>
                <button type="button" disabled={restoring || pending} className={styles.cardEntry} onClick={() => props.onRestore(project)} aria-label={`打开项目 ${project.name}`} />
                <div className={`project-cover ${styles.creativeCover}`}>
                  {cover ? <PrivateObjectImage src={cover.previewUrl} alt={`${project.name} 项目封面`} style={{ objectPosition: "50% 45%" }} /> : <span className="project-cover-empty">暂无生成图片</span>}
                  <span>{images.length} 张图片</span>
                </div>
                <div className="project-card-footer"><div><h2>{project.name}</h2><p>{formatProjectUpdated(project.updatedAt)}</p></div><div className={styles.actions}>
                  <ProjectMenu name={project.name} disabled={pending || restoring || props.busyProjectId === project.id} onAction={(action) => openAction({ kind: "creative", id: project.id, name: project.name, action })} />
                </div></div>
                {restoring && <span className="project-local-status" role="status">正在恢复项目</span>}
              </article>;
            })}
          </div>
        </>}
    {warning && <div className="project-library-state project-library-error" role="alert"><CircleAlert size={16} /><span>{warning}</span><button type="button" onClick={() => { setWarning(null); props.onRetry(); }}><RefreshCw size={14} />重试清理</button></div>}
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className={styles.dialog} overlayClassName={styles.dialogOverlay} showCloseButton={!pending} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>{target?.action === "delete" ? "删除项目" : "重命名项目"}</DialogTitle><DialogDescription>{target?.action === "delete" ? `确定删除“${target.name}”？项目将无法继续打开，资产库中的素材和生成结果会保留。` : "输入新的项目名称。"}</DialogDescription></DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void confirm(); }}>
          {target?.action === "rename" && <label className={styles.dialogLabel}><span>项目名称</span><Input className={styles.renameInput} autoFocus value={name} maxLength={target.kind === "canvas" ? 20 : 32} disabled={pending} aria-invalid={Boolean(operationError)} aria-describedby={operationError ? "project-operation-error" : undefined} onChange={(event) => setName(event.target.value)} /></label>}
          {operationError && <div className="project-operation-error" role="alert"><p id="project-operation-error" className={styles.error}>{operationError}</p><button type="button" disabled={pending || props.loading} onClick={props.onRetry}><RefreshCw size={13} />重新读取项目</button></div>}
          <div className={styles.dialogActions}><Button type="button" variant="secondary" disabled={pending} onClick={close}>取消</Button><Button type="submit" className={styles.confirm} disabled={pending || props.loading || (target?.action === "rename" && !name.trim())}>{pending ? target?.action === "delete" ? "正在删除" : "正在保存" : target?.action === "delete" ? "确认删除" : "保存"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
