import { storedReferenceFile, restoredReferenceFile } from "@/features/references/reference-file-identity.mjs";
import type { CanvasProjectDocument } from "@/shared/contracts/canvas-project";

export type LocalCanvasProject = Readonly<{
  id: string;
  name: string;
  document: CanvasProjectDocument;
  version: number | null;
  dirty: boolean;
  updatedAt: string;
}>;

const DATABASE_NAME = "goodgood-canvas-projects";
const DATABASE_VERSION = 1;
const DOCUMENTS = "documents";
const FILES = "files";

let databasePromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS)) db.createObjectStore(DOCUMENTS);
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开画布本地存储。"));
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

function key(ownerKey: string, id: string) {
  return `${ownerKey}:${id}`;
}

async function read<T>(store: string, itemKey: string): Promise<T | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, "readonly").objectStore(store).get(itemKey);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("本地画布读取失败。"));
  });
}

async function write(store: string, itemKey: string, value: unknown): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).put(value, itemKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("本地画布保存失败。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("本地画布保存失败。"));
  });
}

async function remove(store: string, itemKey: string): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, "readwrite");
    transaction.objectStore(store).delete(itemKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("本地画布清理失败。"));
    transaction.onabort = () => reject(transaction.error ?? new Error("本地画布清理失败。"));
  });
}

export function readLocalCanvasProject(ownerKey: string, projectId: string) {
  return read<LocalCanvasProject>(DOCUMENTS, key(ownerKey, projectId));
}

export async function listLocalCanvasProjects(ownerKey: string): Promise<readonly LocalCanvasProject[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const projects: LocalCanvasProject[] = [];
    const request = db.transaction(DOCUMENTS, "readonly").objectStore(DOCUMENTS).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(projects); return; }
      if (typeof cursor.key === "string" && cursor.key.startsWith(`${ownerKey}:`)) projects.push(cursor.value as LocalCanvasProject);
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("本地画布列表读取失败。"));
  });
}

export function writeLocalCanvasProject(ownerKey: string, project: LocalCanvasProject) {
  return write(DOCUMENTS, key(ownerKey, project.id), project);
}

export function removeLocalCanvasProject(ownerKey: string, projectId: string) {
  return remove(DOCUMENTS, key(ownerKey, projectId));
}

export function writeLocalCanvasFile(ownerKey: string, fileId: string, file: File) {
  return write(FILES, key(ownerKey, fileId), storedReferenceFile(file));
}

export async function readLocalCanvasFile(ownerKey: string, fileId: string) {
  return restoredReferenceFile(await read<File | { file: File; reuseExisting?: boolean }>(FILES, key(ownerKey, fileId)));
}

export function removeLocalCanvasFile(ownerKey: string, fileId: string) {
  return remove(FILES, key(ownerKey, fileId));
}
