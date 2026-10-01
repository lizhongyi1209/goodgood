"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readAuthenticationSession, type AuthenticationSession } from "@/features/auth/http-auth-boundary";
import { ProfileAvatar, ProfileReadState, usePersonalProfile, type PersonalProfile } from "./personal-profile";
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
  onEdit: () => void;
}>;

export function PersonalInformationView({ profile, session, loading, error, onRetry, onEdit }: ViewProps) {
  return <section className={styles.information} aria-label="个人信息">
    <header className={styles.header}>
      <div><h1>个人信息</h1><p>管理你的账户基础资料</p></div>
      <Button type="button" variant="outline" size="sm" disabled={loading || Boolean(error) || !profile} onClick={onEdit}>
        <Pencil size={14} aria-hidden="true" />编辑资料
      </Button>
    </header>
    {loading || error ? <ProfileReadState loading={loading} error={error} onRetry={onRetry} /> : <dl className={styles.fields}>
      <div><dt>头像</dt><dd className={styles.identity}><ProfileAvatar className={styles.avatar} url={profile?.avatarUrl} name={profile?.displayName ?? "GoodGood 用户"} /></dd></div>
      <div><dt>昵称</dt><dd>{profile?.displayName ?? "未设置"}</dd></div>
      <div><dt>用户名</dt><dd>{profile?.handle ? `@${profile.handle}` : "未设置"}</dd></div>
      <div><dt>登录邮箱<span className={styles.readOnly}>只读</span></dt><dd>{session?.user.email ?? "未提供"}<p>用于登录和接收验证码</p></dd></div>
      <div><dt>用户 ID<span className={styles.readOnly}>只读</span></dt><dd><CopyableValue value={session?.user.id} label="用户 ID" /></dd></div>
      <div><dt>邀请码<span className={styles.readOnly}>只读</span></dt><dd><CopyableValue value={session?.account.invitationCode} label="邀请码" /><p>分享给朋友，用于注册邀请</p></dd></div>
    </dl>}
  </section>;
}

export function PersonalInformationPanel({ onEdit }: { onEdit: () => void }) {
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
    loading={sessionLoading || profile.loading} error={sessionError ?? profile.error} onRetry={retry} onEdit={onEdit} />;
}
