"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, UserRound } from "lucide-react";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";
import { PrivateObjectImage } from "@/components/ui/private-object-image";
import { Button } from "@/components/ui/button";
import { uploadReferenceFiles } from "@/features/references/http-reference-upload";
import { listReferenceMaterials } from "@/features/references/http-reference-library";
import { normalizeProfileName, PROFILE_AVATAR_MAX_BYTES } from "@/shared/profile-policy.mjs";

export type PersonalProfile = { displayName: string; publicUserId: string | null; createdAt?: string | null; avatarReferenceId: string | null; avatarUrl: string | null; version: number };
export type ProfileInput = Pick<PersonalProfile, "displayName" | "avatarReferenceId" | "version">;
export function normalizeProfileInput(input: ProfileInput): ProfileInput {
  return { displayName: normalizeProfileName(input.displayName), avatarReferenceId: input.avatarReferenceId, version: input.version };
}
export function validateProfileAvatarFile(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size === 0 || file.size > PROFILE_AVATAR_MAX_BYTES) throw new Error("请选择不超过 2 MB 的 JPG/JPEG 或 PNG 图片。");
}
export async function uploadProfileAvatar(file: File, signal?: AbortSignal) {
  validateProfileAvatarFile(file);
  signal?.throwIfAborted();
  const [reference] = await uploadReferenceFiles([{ clientId: crypto.randomUUID(), file }], () => {}, null, signal);
  signal?.throwIfAborted();
  if (!reference || reference.reference.status !== "ready") throw new Error(reference?.reference.errorMessage ?? "头像上传失败，请重新选择图片。");
  const material = (await listReferenceMaterials(null)).find(item => item.id === reference.reference.id);
  signal?.throwIfAborted();
  if (!material) throw new Error("头像暂时不可用，请重新上传。");
  return material;
}
async function profileRequest(input?: ProfileInput, signal?: AbortSignal): Promise<PersonalProfile> {
  const response = await goodGoodApiFetch("/api/profile", { cache: "no-store", signal, ...(input ? { method: "PATCH", headers: { "content-type": "application/json", "x-goodgood-profile-action": "1" }, body: JSON.stringify(input) } : {}) });
  const payload = await response.json() as PersonalProfile & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? "个人资料暂时不可用，请重试。");
  signal?.throwIfAborted();
  return payload;
}
export function usePersonalProfile(accountKey: string | null) {
  const [record, setRecord] = useState<{ key: string; profile: PersonalProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const keyRef = useRef(accountKey);
  const mountedRef = useRef(false);
  const instanceRef = useRef({});
  useEffect(() => { keyRef.current = accountKey; }, [accountKey]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!accountKey) return;
    let active = true;
    const read = () => void profileRequest().then(profile => { if (active) { setRecord({ key: accountKey, profile }); setFailure(null); } }).catch(error => { if (active) setFailure({ key: accountKey, message: error instanceof Error ? error.message : "个人资料暂时不可用。" }); });
    const updated = (event: Event) => { if ((event as CustomEvent).detail !== instanceRef.current) setRevision(current => current + 1); };
    read(); window.addEventListener("goodgood:personal-profile-updated", updated);
    return () => { active = false; window.removeEventListener("goodgood:personal-profile-updated", updated); };
  }, [accountKey, revision]);
  const profile = record?.key === accountKey ? record.profile : null;
  const error = failure?.key === accountKey ? failure.message : null;
  const reload = useCallback(() => { setRecord(null); setFailure(null); setRevision(current => current + 1); }, []);
  const save = async (input: ProfileInput, signal?: AbortSignal) => {
    const key = accountKey;
    const value = await profileRequest(input, signal);
    if (mountedRef.current && key && keyRef.current === key && !signal?.aborted) {
      setRecord({ key, profile: value }); setFailure(null);
      window.dispatchEvent(new CustomEvent("goodgood:personal-profile-updated", { detail: instanceRef.current }));
    }
    return value;
  };
  return { profile, error, loading: Boolean(accountKey && !profile && !error), reload, save };
}
export function ProfileAvatar({ url, name, className = "" }: { url?: string | null; name: string; className?: string }) {
  return <span className={`profile-avatar ${className}`}>{url ? <PrivateObjectImage src={url} alt={`${name}的头像`} loading="eager" /> : <UserRound aria-hidden="true" size={28} />}</span>;
}
export function ProfileReadState({ loading, error, onRetry }: { loading: boolean; error?: string | null; onRetry: () => void }) {
  return <div className="profile-read-state" role={error ? "alert" : "status"}>{loading ? <><LoaderCircle size={18} />正在读取个人资料</> : <>{error}<Button type="button" variant="ghost" onClick={onRetry}><RefreshCw size={15} />重试</Button></>}</div>;
}
