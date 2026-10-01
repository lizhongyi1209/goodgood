"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, Copy, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readAuthenticationSession, type AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { normalizeProfileInput, uploadProfileAvatar, ProfileAvatar, ProfileReadState, usePersonalProfile, type PersonalProfile, type ProfileInput } from "./personal-profile";
import styles from "./personal-information.module.css";

export async function copyAccountInformation(value: string, clipboard?: Pick<Clipboard, "writeText">) {
  if (!value.trim()) throw new Error("暂无可复制的内容。");
  if (!clipboard?.writeText) throw new Error("当前无法自动复制，请手动选择复制。");
  await clipboard.writeText(value);
}

function CopyableValue({ value, label }: { value?: string; label: string }) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  async function copy() {
    if (!value || busy) return;
    setBusy(true);
    setMessage("");
    setCopied(false);
    try {
      await copyAccountInformation(value, navigator.clipboard);
      setCopied(true);
      setMessage(`${label}已复制`);
    } catch {
      setMessage("复制失败，请手动选择复制。");
    } finally { setBusy(false); }
  }
  return <div className={styles.copyable}>
    <div className={styles.copyLine}>
      <span className={styles.copyValue}>{value || "暂不可用"}</span>
      <Button type="button" variant="ghost" size="sm" disabled={!value || busy} aria-label={`复制${label}`} onClick={() => void copy()}>
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? "已复制" : "复制"}
      </Button>
    </div>
    {message && <span className={styles.copyMessage} role="status">{message}</span>}
  </div>;
}

type ViewProps = Readonly<{
  profile: PersonalProfile | null;
  session: AuthenticationSession | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSave: (input: ProfileInput) => Promise<PersonalProfile>;
}>;

function PersonalInformationForm({ profile, session, onSave, onRetry }: Pick<ViewProps, "session" | "onSave" | "onRetry"> & { profile: PersonalProfile }) {
  const [name, setName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle ?? "");
  const [avatarId, setAvatarId] = useState(profile.avatarReferenceId);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef(0);
  useEffect(() => () => { uploadRef.current += 1; }, []);
  const pending = busy || uploading;
  const dirty = name !== profile.displayName || handle !== (profile.handle ?? "") || avatarId !== profile.avatarReferenceId;
  function changed() { setError(null); setSaved(false); }
  function cancel() {
    setName(profile.displayName); setHandle(profile.handle ?? "");
    setAvatarId(profile.avatarReferenceId); setAvatarUrl(profile.avatarUrl); changed();
  }
  async function upload(file: File) {
    if (pending) return;
    const request = ++uploadRef.current;
    setUploading(true); changed();
    try {
      const material = await uploadProfileAvatar(file);
      if (uploadRef.current === request) { setAvatarId(material.id); setAvatarUrl(material.url); }
    } catch (cause) {
      if (uploadRef.current === request) setError(cause instanceof Error ? cause.message : "头像上传失败，请重试。");
    } finally { if (uploadRef.current === request) setUploading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !dirty) return;
    let input: ProfileInput;
    try { input = normalizeProfileInput({ displayName: name, handle, avatarReferenceId: avatarId, version: profile.version }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "请检查个人资料。"); return; }
    setBusy(true); changed();
    try {
      const value = await onSave(input);
      setName(value.displayName); setHandle(value.handle ?? "");
      setAvatarId(value.avatarReferenceId); setAvatarUrl(value.avatarUrl); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败，请重试。"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} aria-label="编辑个人信息">
    <dl className={styles.fields}>
      <div><dt>头像</dt><dd>
        <div className={styles.identity}>
          <ProfileAvatar className={styles.avatar} url={avatarUrl} name={name || "GoodGood 用户"} />
          <div className={styles.avatarActions}>
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
              {uploading ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}{uploading ? "上传中" : "更换头像"}
            </Button>
            {avatarId && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => { setAvatarId(null); setAvatarUrl(null); changed(); }}>移除头像</Button>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" aria-label="上传头像" hidden disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
        </div><p>JPG/JPEG 或 PNG，最大 20 MB，居中裁切</p>
      </dd></div>
      <div><dt><Label htmlFor="account-information-name">昵称</Label></dt><dd>
        <Input id="account-information-name" value={name} disabled={pending} autoComplete="nickname" aria-describedby="account-information-name-hint" onChange={(event) => { setName(event.target.value); changed(); }} />
        <p id="account-information-name-hint">1–30 个字符</p>
      </dd></div>
      <div><dt><Label htmlFor="account-information-handle">用户名</Label></dt><dd>
        <div className={styles.handleInput}><span aria-hidden="true">@</span><Input id="account-information-handle" value={handle} placeholder="设置用户名" disabled={pending} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="account-information-handle-hint" onChange={(event) => { setHandle(event.target.value); changed(); }} /></div>
        <p id="account-information-handle-hint">3–24 位字母、数字或下划线，不能与其他用户重复</p>
      </dd></div>
      <div><dt>登录邮箱<span className={styles.readOnly}>只读</span></dt><dd>{session?.user.email ?? "未提供"}<p>用于登录和接收验证码</p></dd></div>
      <div><dt>用户 ID<span className={styles.readOnly}>只读</span></dt><dd><CopyableValue value={session?.user.id} label="用户 ID" /></dd></div>
      <div><dt>邀请码<span className={styles.readOnly}>只读</span></dt><dd><CopyableValue value={session?.account.invitationCode} label="邀请码" /><p>分享给朋友，用于注册邀请</p></dd></div>
    </dl>
    {error && <div className={styles.feedback} role="alert">{error}{error.includes("其他页面") && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRetry}>重新读取资料</Button>}</div>}
    {saved && <p className={styles.feedback} role="status">资料已保存</p>}
    <footer className={styles.actions}>
      <Button type="button" variant="secondary" disabled={pending || !dirty} onClick={cancel}>取消</Button>
      <Button type="submit" disabled={pending || !dirty}>{busy ? <><LoaderCircle size={14} className="animate-spin" aria-hidden="true" />保存中</> : "保存资料"}</Button>
    </footer>
  </form>;
}

export function PersonalInformationView({ profile, session, loading, error, onRetry, onSave }: ViewProps) {
  return <section className={styles.information} aria-label="个人信息">
    <header className={styles.header}>
      <div><h1>个人信息</h1><p>管理你的账户基础资料</p></div>
    </header>
    {loading || error || !profile ? <ProfileReadState loading={loading || (!error && !profile)} error={error} onRetry={onRetry} />
      : <PersonalInformationForm key={session?.user.id ?? session?.user.email ?? "current-account"} profile={profile} session={session} onSave={onSave} onRetry={onRetry} />}
  </section>;
}

export function PersonalInformationPanel() {
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
      if (!value || value.preview || value.access.status !== "active") {
        setSessionError("请登录已开通的账户后查看个人信息。");
      } else { setSession(value); setSessionError(null); }
    }).catch((cause) => {
      if (active) setSessionError(cause instanceof Error ? cause.message : "账户信息暂时不可用，请重试。");
    }).finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, [revision]);

  function retry() {
    if (sessionError) {
      setSession(null);
      setSessionError(null);
      setSessionLoading(true);
      setRevision((current) => current + 1);
    } else { profile.reload(); }
  }
  return <PersonalInformationView profile={profile.profile} session={session}
    loading={sessionLoading || profile.loading} error={sessionError ?? profile.error} onRetry={retry} onSave={profile.save} />;
}
