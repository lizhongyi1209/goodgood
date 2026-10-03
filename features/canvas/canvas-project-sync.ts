import { getCanvasProjectPages, type CanvasProjectDocument, type CanvasProjectRecord } from "@/shared/contracts/canvas-project";
import { CanvasProjectBoundaryError, readCanvasProject, saveCanvasProject } from "./canvas-project-boundary";
import {
  removeLocalCanvasProject,
  writeLocalCanvasProject,
  type LocalCanvasProject,
} from "./canvas-project-local";
import { pendingCanvasProjectContent, remoteCanvasProjectDocument } from "./canvas-project-snapshot";

export type CanvasSaveState = "saving" | "saved" | "offline" | "local-error";

function pendingContentMessage(content: ReturnType<typeof pendingCanvasProjectContent>) {
  return content === "materials" ? "素材正在上传或仅保存在本机；完成后会继续同步。"
    : content === "generation" ? "生成请求尚未确认；当前内容已保存在本机，确认后会继续同步。" : undefined;
}

function contentSignature(name: string, document: CanvasProjectDocument) {
  return JSON.stringify([
    name, getCanvasProjectPages(document).map((page) => [
      page.id, page.name, page.nodes, page.edges, page.generators, page.convertedReferences ?? {},
    ]),
  ]);
}

export class CanvasProjectSync {
  private current: LocalCanvasProject;
  private revision = 0;
  private localQueue: Promise<void> = Promise.resolve();
  private remoteBusy = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 2500;
  private closed = false;
  private localHealthy = true;
  private readonly failedLocalFiles = new Set<string>();
  private retryBlocked = false;
  private localContentSignature: string;
  private lastRemoteContentSignature: string | null;

  constructor(
    private readonly ownerKey: string,
    initial: LocalCanvasProject,
    private readonly onState: (state: CanvasSaveState, detail?: string) => void,
    private readonly onFork: (id: string) => void,
  ) {
    this.current = initial;
    this.localContentSignature = contentSignature(initial.name, initial.document);
    this.lastRemoteContentSignature = !initial.dirty && initial.version !== null
      ? contentSignature(initial.name, remoteCanvasProjectDocument(initial.document)) : null;
  }

  get id() { return this.current.id; }
  get snapshot() { return this.current; }

  async flushLocal(): Promise<void> {
    await this.localQueue;
    if (!this.localHealthy) throw new Error("本地画布保存失败。");
  }

  markFilePersistenceFailed(id: string) {
    this.failedLocalFiles.add(id);
    this.report("local-error", "素材未能写入本地存储；刷新前请检查浏览器存储空间并重试上传。");
  }

  markFilePersistenceReady(id: string) {
    const recovered = this.failedLocalFiles.delete(id);
    if (!recovered || this.failedLocalFiles.size || this.closed) return;
    this.report(this.localHealthy ? this.current.dirty ? "saving" : "saved" : "local-error");
  }

  private report(state: CanvasSaveState, detail?: string) {
    if (this.failedLocalFiles.size) {
      this.onState("local-error", "素材未能写入本地存储；刷新前请检查浏览器存储空间并重试上传。");
      return;
    }
    this.onState(state, detail);
  }

  update(name: string, document: CanvasProjectDocument): Promise<void> {
    if (this.closed) return Promise.resolve();
    const signature = contentSignature(name, document);
    if (signature === this.localContentSignature) return Promise.resolve();
    this.localContentSignature = signature;
    this.revision += 1;
    const snapshot: LocalCanvasProject = {
      id: this.current.id,
      name,
      document,
      version: this.current.version,
      dirty: true,
      updatedAt: new Date().toISOString(),
    };
    this.current = snapshot;
    this.report("saving");
    this.localHealthy = true;
    this.retryBlocked = false;
    this.localQueue = this.localQueue.catch(() => {}).then(() => writeLocalCanvasProject(this.ownerKey, snapshot))
      .catch((error) => {
        this.localHealthy = false;
        this.report("local-error", "本地保存失败，请检查浏览器存储空间。");
        throw error;
      });
    this.schedule(420);
    return this.localQueue;
  }

  retry() {
    if (!this.closed) {
      this.retryBlocked = false;
      if (!this.localHealthy) {
        this.localQueue = writeLocalCanvasProject(this.ownerKey, this.current).then(() => {
          this.localHealthy = true;
          this.report(this.current.dirty ? "saving" : "saved");
        }).catch((error) => {
          this.report("local-error", "本地保存失败，请检查浏览器存储空间。");
          throw error;
        });
      }
      this.schedule(0);
    }
  }

  close() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private schedule(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  }

  private async flush() {
    if (this.closed || this.remoteBusy || !this.current.dirty) return;
    try {
      await this.localQueue;
    } catch {
      this.report("local-error", "本地保存失败，请检查浏览器存储空间。");
      return;
    }
    if (!this.localHealthy) return;
    if (this.closed) return;
    this.remoteBusy = true;
    const sent = this.current;
    const sentRevision = this.revision;
    const remoteDocument = remoteCanvasProjectDocument(sent.document);
    const remoteSignature = contentSignature(sent.name, remoteDocument);
    try {
      if (sent.version !== null && remoteSignature === this.lastRemoteContentSignature) {
        const changedDuringSave = this.revision !== sentRevision;
        const pendingContent = pendingCanvasProjectContent(this.current.document);
        const pendingLocalContent = Boolean(pendingContent);
        if (!changedDuringSave && !pendingLocalContent) {
          this.current = { ...this.current, dirty: false };
          const written = this.current;
          this.localQueue = this.localQueue.catch(() => {}).then(() => writeLocalCanvasProject(this.ownerKey, written));
          try { await this.localQueue; }
          catch {
            this.localHealthy = false;
            this.report("local-error", "本地保存失败，请检查浏览器存储空间。");
            return;
          }
        }
        const changedAfterWrite = this.revision !== sentRevision;
        this.report(changedAfterWrite ? "saving" : pendingLocalContent ? "offline" : "saved",
          !changedAfterWrite ? pendingContentMessage(pendingContent) : undefined);
        if (changedAfterWrite) this.schedule(0);
        return;
      }
      const result = await saveCanvasProject({
        id: sent.id,
        expectedVersion: sent.version,
        name: sent.name,
        document: remoteDocument,
      });
      if (this.closed) return;
      this.lastRemoteContentSignature = remoteSignature;
      this.retryDelay = 2500;
      this.retryBlocked = false;
      const changedDuringSave = this.revision !== sentRevision;
      const pendingContent = pendingCanvasProjectContent(this.current.document);
      const pendingLocalContent = Boolean(pendingContent);
      this.current = { ...this.current, version: result.version, dirty: changedDuringSave || pendingLocalContent };
      const written = this.current;
      this.localQueue = this.localQueue.catch(() => {}).then(() => writeLocalCanvasProject(this.ownerKey, written));
      try { await this.localQueue; }
      catch {
        this.localHealthy = false;
        this.report("local-error", "画布已到达服务器，但本地缓存更新失败；请检查浏览器存储空间。");
        return;
      }
      const changedAfterWrite = this.revision !== sentRevision;
      this.report(changedAfterWrite ? "saving" : pendingLocalContent ? "offline" : "saved",
        !changedAfterWrite ? pendingContentMessage(pendingContent) : undefined);
      if (changedAfterWrite) this.schedule(0);
    } catch (error) {
      if (this.closed) return;
      if (error instanceof CanvasProjectBoundaryError && error.code === "VERSION_CONFLICT") {
        try {
          await this.fork();
        } catch {
          this.localHealthy = false;
          this.report("local-error", "项目版本冲突，本地副本创建失败；当前内容仍在页面中，请检查浏览器存储空间。");
        }
      } else {
        const slotDocumentRejected = error instanceof CanvasProjectBoundaryError && error.code === "INVALID_CANVAS_PROJECT" &&
          getCanvasProjectPages(this.current.document).some((page) => page.nodes.some((node) => node.imageSlots));
        this.report("offline", slotDocumentRejected ? "服务器暂不支持图片插槽；当前画布已保存在本机，更新后台后可继续同步。"
          : error instanceof Error ? error.message : "网络不可用，画布已留在本机，恢复后重试。");
        if (!(error instanceof CanvasProjectBoundaryError) || error.retryable || error.status === 404) this.scheduleRetry();
        else this.retryBlocked = true;
      }
    } finally {
      this.remoteBusy = false;
      if (!this.closed && !this.retryBlocked && this.current.dirty && (this.current.version === null || !pendingCanvasProjectContent(this.current.document)) &&
          this.timer === null && this.retryTimer === null) this.schedule(0);
    }
  }

  private scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
  }

  private async fork() {
    const oldId = this.current.id;
    const newId = crypto.randomUUID();
    const newSnapshot: LocalCanvasProject = {
      ...this.current, id: newId, version: null, dirty: true, updatedAt: new Date().toISOString(),
    };
    await writeLocalCanvasProject(this.ownerKey, newSnapshot);
    this.current = newSnapshot;
    this.lastRemoteContentSignature = null;
    await removeLocalCanvasProject(this.ownerKey, oldId).catch(() => {});
    this.onFork(newId);
    this.report("offline", "原项目已在其他页面更新；当前修改已保留为新画布，正在同步。");
  }
}

export function localCanvasProjectFromRemote(project: CanvasProjectRecord): LocalCanvasProject {
  return {
    id: project.id,
    name: project.name,
    document: project.document,
    version: project.version,
    dirty: false,
    updatedAt: project.updatedAt,
  };
}
