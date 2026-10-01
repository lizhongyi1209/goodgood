"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent } from "react";
import { Camera, Check, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileDisplayName } from "@/shared/profile-policy.mjs";
import { readAuthenticationSession, type AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { commitProfileEdit } from "./profile-edit-transaction.mjs";
import { validateProfileAvatarFile, uploadProfileAvatar, ProfileAvatar, ProfileReadState, usePersonalProfile, type PersonalProfile, type ProfileInput } from "./personal-profile";
import styles from "./personal-information.module.css";

type ViewProps = Readonly<{
  profile: PersonalProfile | null;
  session: AuthenticationSession | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSave: (input: ProfileInput, signal?: AbortSignal) => Promise<PersonalProfile>;
  onPendingChange?: (pending: boolean) => void;
}>;
type EditKind = "name" | "avatar";

function PersonalInformationForm({ profile, session, onSave, onRetry, onPendingChange }: Pick<ViewProps, "session" | "onSave" | "onRetry" | "onPendingChange"> & { profile: PersonalProfile }) {
  const [editing, setEditing] = useState<EditKind | null>(null);
  const [editProfile, setEditProfile] = useState(profile);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const name = profileDisplayName(profile.displayName);
  const nameRoot = useRef<HTMLDivElement>(null);
  const avatarRoot = useRef<HTMLDivElement>(null);
  const nameText = useRef<HTMLSpanElement>(null);
  const nameTrigger = useRef<HTMLButtonElement>(null);
  const avatarTrigger = useRef<HTMLButtonElement>(null);
  const confirmName = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const editingRef = useRef<EditKind | null>(null);
  const busyRef = useRef(false);
  const previewRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const hintId = useId();

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null; setPreview(null); setFile(null); setRemoveAvatar(false);
  }
  function cancel(restoreFocus = false) {
    if (busyRef.current) return;
    const previous = editingRef.current;
    editingRef.current = null; setEditing(null); clearPreview(); setError(null);
    if (restoreFocus) window.requestAnimationFrame(() => { if (mountedRef.current) (previous === "name" ? nameTrigger : avatarTrigger).current?.focus(); });
  }
  function begin(kind: EditKind) {
    if (busyRef.current) return;
    clearPreview(); setError(null); setSaved(false); setEditProfile({ ...profile, displayName: name }); editingRef.current = kind; setEditing(kind);
  }
  useEffect(() => {
    mountedRef.current = true;
    const outside = (event: Event) => {
      const kind = editingRef.current;
      const region = kind === "name" ? nameRoot.current : avatarRoot.current;
      if (!kind || busyRef.current || (event.target instanceof Node && region?.contains(event.target))) return;
      editingRef.current = null; setEditing(null); setError(null); setFile(null); setRemoveAvatar(false); setPreview(null);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    return () => {
      mountedRef.current = false; editingRef.current = null;
      requestRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
    };
  }, []);
  useEffect(() => {
    if (editing !== "name") return;
    const element = nameText.current;
    if (!element) return;
    element.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges(); selection?.addRange(range);
  }, [editing]);

  function select(fileValue: File) {
    if (busyRef.current || editingRef.current !== "avatar") return;
    try {
      validateProfileAvatarFile(fileValue);
      clearPreview();
      const url = URL.createObjectURL(fileValue);
      previewRef.current = url; setPreview(url); setFile(fileValue); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "头像不可用，请重新选择。"); }
  }
  async function confirm(kind: EditKind) {
    if (busyRef.current || editingRef.current !== kind) return;
    const request = new AbortController();
    requestRef.current = request; busyRef.current = true; setBusy(true); setError(null); onPendingChange?.(true);
    try {
      await commitProfileEdit({ profile: editProfile, kind, name: nameText.current?.textContent ?? "", file, removeAvatar, uploadAvatar: uploadProfileAvatar, save: onSave, signal: request.signal });
      if (mountedRef.current && !request.signal.aborted) { editingRef.current = null; setEditing(null); clearPreview(); setSaved(true); }
    } catch (cause) {
      if (mountedRef.current && !request.signal.aborted) setError(cause instanceof Error ? cause.message : "保存失败，请重试。");
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null; busyRef.current = false;
        if (mountedRef.current) setBusy(false);
        onPendingChange?.(false);
      }
    }
  }
  function plainPaste(event: ClipboardEvent<HTMLSpanElement>) {
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection?.rangeCount || !nameText.current?.contains(selection.anchorNode)) return;
    const text = event.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ");
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); setError(null);
  }

  return <div aria-label="编辑个人信息">
    <dl className={styles.fields}>
      <div><dt>头像</dt><dd>
        <div ref={avatarRoot} className={styles.editRegion} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(true); } }}>
          <div className={styles.identity}>
            <button ref={avatarTrigger} type="button" className={styles.avatarButton} aria-label="修改头像" aria-describedby={editing === "avatar" ? `${hintId}-avatar` : undefined} disabled={busy} onClick={() => { if (editing !== "avatar") begin("avatar"); fileInput.current?.click(); }}>
              <ProfileAvatar className={styles.avatar} url={removeAvatar ? null : preview ?? (editing === "avatar" ? editProfile.avatarUrl : profile.avatarUrl)} name={name} />
              <span className={styles.avatarEdit}><Camera size={12} aria-hidden="true" /></span>
            </button>
            {editing === "avatar" && <>
              {editProfile.avatarReferenceId && <Button type="button" variant="ghost" size="icon" aria-label="移除头像" title="移除头像" disabled={busy} onClick={() => { clearPreview(); setRemoveAvatar(true); setError(null); }}><Trash2 size={15} aria-hidden="true" /></Button>}
              <Button type="button" variant="ghost" size="icon" className={styles.confirm} aria-label="确认保存头像" title="确认保存头像" disabled={busy || (!file && !removeAvatar)} onClick={() => void confirm("avatar")}>
                {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              </Button>
            </>}
            <input ref={fileInput} type="file" accept="image/jpeg,image/png" aria-label="选择头像文件" hidden disabled={busy} onChange={(event) => { const value = event.target.files?.[0]; event.target.value = ""; if (value) select(value); }} />
          </div>
          <p id={`${hintId}-avatar`} className={styles.rules} aria-hidden={editing !== "avatar"}>JPG/JPEG 或 PNG，最大 2 MB。头像居中裁切。</p>
          {editing === "avatar" && error && <div className={styles.feedback} role="alert">{error}{error.includes("其他页面") && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRetry}>重新读取资料</Button>}</div>}
        </div>
      </dd></div>
      <div><dt>用户名</dt><dd>
        <div ref={nameRoot} className={styles.editRegion}>
          {editing === "name" ? <>
            <div className={styles.nameEditor}>
              <span ref={nameText} className={styles.editableText} role="textbox" contentEditable={!busy} suppressContentEditableWarning aria-label="编辑用户名" aria-multiline="false" aria-describedby={`${hintId}-name`} aria-invalid={Boolean(error)} aria-busy={busy} spellCheck={false} onInput={() => setError(null)} onPaste={plainPaste} onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") { event.preventDefault(); confirmName.current?.focus(); }
                if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(true); }
              }}>{editProfile.displayName}</span>
              <Button ref={confirmName} type="button" variant="ghost" size="icon" className={styles.confirm} aria-label="确认保存用户名" title="确认保存用户名" disabled={busy} onClick={() => void confirm("name")}>
                {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              </Button>
            </div>
          </> : <button ref={nameTrigger} type="button" className={styles.editableValue} aria-label="修改用户名" title={name} disabled={busy} onClick={() => begin("name")}><span>{name}</span><Pencil size={12} aria-hidden="true" /></button>}
          <p id={`${hintId}-name`} className={styles.rules} aria-hidden={editing !== "name"}>1–30 个字符，支持中文、字母、数字和表情，不能换行。</p>
          {editing === "name" && error && <div className={styles.feedback} role="alert">{error}{error.includes("其他页面") && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRetry}>重新读取资料</Button>}</div>}
        </div>
      </dd></div>
      <div><dt>登录邮箱</dt><dd>{session?.user.email ?? "未提供"}</dd></div>
      <div><dt>用户 ID</dt><dd className={styles.userId}>{profile.publicUserId ?? "暂不可用"}</dd></div>
      <div><dt>邀请码</dt><dd>{session?.account.invitationCode ?? "暂不可用"}</dd></div>
    </dl>
    {saved && <p className={styles.feedback} role="status">资料已保存</p>}
  </div>;
}

export function PersonalInformationView({ profile, session, loading, error, onRetry, onSave, onPendingChange }: ViewProps) {
  return <section className={styles.information} aria-label="个人信息">
    <header className={styles.header}><h1>个人信息</h1></header>
    {loading || error || !profile ? <ProfileReadState loading={loading || (!error && !profile)} error={error} onRetry={onRetry} />
      : <PersonalInformationForm key={session?.user.id ?? session?.user.email ?? "current-account"} profile={profile} session={session} onSave={onSave} onRetry={onRetry} onPendingChange={onPendingChange} />}
  </section>;
}

export function PersonalInformationPanel({ onPendingChange }: { onPendingChange?: (pending: boolean) => void } = {}) {
  const [session, setSession] = useState<AuthenticationSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const accountKey = session && !session.preview && session.access.status === "active"
    ? session.user.id ?? session.user.email ?? "authenticated" : null;
  const profile = usePersonalProfile(accountKey);
  useEffect(() => {
    let active = true;
    void readAuthenticationSession().then((value) => {
      if (!active) return;
      if (!value || value.preview || value.access.status !== "active") setSessionError("请登录已开通的账户后查看个人信息。");
      else { setSession(value); setSessionError(null); }
    }).catch((cause) => { if (active) setSessionError(cause instanceof Error ? cause.message : "账户信息暂时不可用，请重试。"); })
      .finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, [revision]);
  function retry() {
    if (sessionError) { setSession(null); setSessionError(null); setSessionLoading(true); setRevision((current) => current + 1); }
    else profile.reload();
  }
  return <PersonalInformationView profile={profile.profile} session={session} loading={sessionLoading || profile.loading}
    error={sessionError ?? profile.error} onRetry={retry} onSave={profile.save} onPendingChange={onPendingChange} />;
}
