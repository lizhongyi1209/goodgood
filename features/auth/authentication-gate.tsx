"use client";

import Image from "next/image";
import { LoaderCircle, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AuthenticationBoundaryError,
  readAuthenticationMethod,
  readEmailAuthenticationChallenge,
  requestEmailAuthenticationCode,
  verifyEmailAuthenticationCode,
  type EmailAuthenticationChallenge,
} from "./http-auth-boundary";

export function AuthenticationGate({
  initialError,
  initialEmail = "",
  invitationOnly = false,
  onAuthenticated,
  onHostedLogin,
}: {
  initialError: string | null;
  initialEmail?: string;
  invitationOnly?: boolean;
  onAuthenticated: () => Promise<void>;
  onHostedLogin: () => void;
}) {
  const [method, setMethod] = useState<"email_code" | "hosted" | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [register, setRegister] = useState(invitationOnly);
  const [invitationCode, setInvitationCode] = useState("");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [challenge, setChallenge] =
    useState<EmailAuthenticationChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [errorTarget, setErrorTarget] = useState<
    "email" | "code" | "invitation" | "general" | null
  >(initialError ? "general" : null);
  const [busy, setBusy] = useState<"loading" | "sending" | "verifying" | null>(
    "loading",
  );
  const [methodAttempt, setMethodAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [resendAvailableAt, setResendAvailableAt] = useState(0);

  useEffect(() => {
    let active = true;
    void readAuthenticationMethod()
      .then(async (value) => {
        if (!active) return;
        setMethod(value);
        if (value === "email_code") {
          const current = await readEmailAuthenticationChallenge();
          if (active) {
            setChallenge(current);
            setResendAvailableAt(
              current ? Date.now() + current.resendAfterSeconds * 1_000 : 0,
            );
          }
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "登录方式暂时无法确认，请重试。",
          );
          setErrorTarget("general");
        }
      })
      .finally(() => {
        if (active) setBusy(null);
      });
    return () => {
      active = false;
    };
  }, [methodAttempt]);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const resendRemaining = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1_000),
  );

  const sendCode = async () => {
    setBusy("sending");
    setError(null);
    setErrorTarget(null);
    try {
      const next = await requestEmailAuthenticationCode(
        email,
        `${window.location.pathname}${window.location.search}`,
      );
      setChallenge(next);
      setRequestedEmail(email.trim());
      setCode("");
      setNow(Date.now());
      setResendAvailableAt(Date.now() + next.resendAfterSeconds * 1_000);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "验证码邮件暂时无法发送，请稍后重试。",
      );
      setErrorTarget("email");
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async () => {
    if (!challenge) return;
    setBusy("verifying");
    setError(null);
    setErrorTarget(null);
    try {
      await verifyEmailAuthenticationCode(
        challenge.id,
        code,
        register ? invitationCode : undefined,
      );
      await onAuthenticated();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "验证码无效或已过期，请重新获取。",
      );
      if (
        reason instanceof AuthenticationBoundaryError &&
        ["INVITATION_REQUIRED", "INVITATION_INVALID"].includes(reason.code)
      ) {
        setRegister(true);
        setErrorTarget("invitation");
      } else setErrorTarget("code");
    } finally {
      setBusy(null);
    }
  };

  const editEmail = () => {
    setChallenge(null);
    setRequestedEmail(null);
    setCode("");
    setError(null);
    setErrorTarget(null);
    setResendAvailableAt(0);
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setError(null);
    setErrorTarget(null);
    if (challenge && requestedEmail === null) {
      setChallenge(null);
      setCode("");
      setResendAvailableAt(0);
    }
  };

  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    if (errorTarget === "code") {
      setError(null);
      setErrorTarget(null);
    }
  };

  const sendCodeLabel =
    busy === "sending"
      ? "正在发送"
      : resendRemaining > 0
        ? `${resendRemaining} 秒后重发`
        : challenge
          ? "重新发送"
          : "发送验证码";

  if (busy === "loading" && method === null) {
    return (
      <div
        className="authentication-gate"
        role="status"
        aria-label="正在读取登录方式"
      >
        <div className="authentication-card authentication-loading">
          <LoaderCircle className="animate-spin" size={20} />
          <span>正在读取登录方式</span>
        </div>
      </div>
    );
  }

  if (method === null) {
    return (
      <div
        className="authentication-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="authentication-title"
      >
        <div className="authentication-card email-authentication-card">
          <div
            className="authentication-brand"
            role="img"
            aria-label="GoodGood"
          >
            <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
            <Image src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
          </div>
          <h2 id="authentication-title">登录暂时不可用</h2>
          <div className="authentication-error" role="alert">
            {error ?? "登录方式暂时无法确认，请重试。"}
          </div>
          <Button
            className="authentication-submit"
            onClick={() => {
              setBusy("loading");
              setError(null);
              setErrorTarget(null);
              setMethodAttempt((value) => value + 1);
            }}
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="authentication-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="authentication-title"
    >
      <div className="authentication-card email-authentication-card">
        <div
          className={`authentication-brand${method === "email_code" ? " authentication-brand-stacked" : ""}`}
          role="img"
          aria-label="GoodGood"
        >
          {method === "email_code" ? (
            <span className="authentication-brand-badge">
              <Image src="/goodgood-mark.svg" alt="" width={22} height={17} />
            </span>
          ) : (
            <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
          )}
          <Image src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
        </div>
        {method === "hosted" ? (
          <>
            <h2 id="authentication-title">登录后继续创作</h2>
            <p>
              使用 Google 账号或邮箱验证码。新用户请使用邮箱验证码和邀请码注册。
            </p>
            {error && (
              <div className="authentication-error" role="alert">
                {error}
              </div>
            )}
            <button className="authentication-submit" onClick={onHostedLogin}>
              <LogIn size={16} />
              Google / 邮箱验证码登录
            </button>
          </>
        ) : (
          <>
            <h2 className="authentication-mode-title" id="authentication-title">
              {invitationOnly
                ? "邀请码开通"
                : register
                  ? "邀请码注册"
                  : "邮箱验证码登录"}
            </h2>
            <form
              className="authentication-form"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCode();
              }}
            >
              <div className="authentication-email-field">
                <span className="authentication-input-shell">
                  <Mail aria-hidden="true" size={16} />
                  <Input
                    aria-invalid={errorTarget === "email"}
                    aria-label="邮箱"
                    autoComplete="email"
                    autoFocus
                    className="authentication-email-input"
                    disabled={
                      busy !== null || Boolean(challenge && requestedEmail)
                    }
                    id="authentication-email"
                    inputMode="email"
                    maxLength={320}
                    onChange={(event) => updateEmail(event.target.value)}
                    placeholder={challenge ? challenge.emailHint : "请输入邮箱"}
                    type="email"
                    value={email}
                  />
                </span>
              </div>

              <div className="authentication-code-row">
                <span className="authentication-input-shell">
                  <ShieldCheck aria-hidden="true" size={16} />
                  <Input
                    aria-invalid={errorTarget === "code"}
                    aria-label="六位登录验证码"
                    autoComplete="one-time-code"
                    className="authentication-code-input"
                    disabled={!challenge || busy !== null}
                    id="authentication-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => updateCode(event.target.value)}
                    pattern="[0-9]{6}"
                    placeholder="请输入 6 位验证码"
                    type="text"
                    value={code}
                  />
                </span>
                <Button
                  aria-live="polite"
                  className="authentication-send-code"
                  disabled={
                    busy !== null || !email.trim() || resendRemaining > 0
                  }
                  onClick={() => void sendCode()}
                  type="button"
                  variant="secondary"
                >
                  {busy === "sending" && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {sendCodeLabel}
                </Button>
              </div>

              {register && (
                <span className="authentication-input-shell">
                  <ShieldCheck aria-hidden="true" size={16} />
                  <Input
                    aria-label="邀请码"
                    aria-invalid={errorTarget === "invitation"}
                    autoComplete="off"
                    maxLength={64}
                    placeholder="请输入邀请码"
                    disabled={busy !== null}
                    value={invitationCode}
                    onChange={(event) => {
                      setInvitationCode(event.target.value);
                      if (errorTarget === "invitation") {
                        setError(null);
                        setErrorTarget(null);
                      }
                    }}
                  />
                </span>
              )}
              {challenge?.delivery === "unknown" && (
                <div className="authentication-notice">
                  发信结果暂未确认，请稍等片刻；收到的当前验证码仍可尝试。
                </div>
              )}
              {error && (
                <div className="authentication-error" role="alert">
                  {error}
                </div>
              )}
              <Button
                className="authentication-submit"
                disabled={
                  busy !== null ||
                  !challenge ||
                  code.length !== 6 ||
                  (register && !invitationCode.trim())
                }
                type="submit"
              >
                {busy === "verifying" && (
                  <LoaderCircle className="animate-spin" />
                )}
                {busy === "verifying"
                  ? "正在验证"
                  : invitationOnly
                    ? "验证并开通"
                    : register
                      ? "注册并登录"
                      : "登录"}
              </Button>
              {challenge && (
                <div className="authentication-delivery" role="status">
                  <span>
                    验证码已提交至 <strong>{challenge.emailHint}</strong>
                    ，请检查收件箱和垃圾邮件。
                  </span>
                  <button
                    className="authentication-edit-email"
                    disabled={busy !== null}
                    onClick={editEmail}
                    type="button"
                  >
                    修改邮箱
                  </button>
                </div>
              )}
              <p className="authentication-registration-hint">
                {register
                  ? "邮箱验证码和邀请码均有效后，账户即可开通。"
                  : "已有账户使用邮箱验证码登录，新用户需邀请码注册。"}
              </p>
              {!invitationOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() => {
                    setRegister((v) => !v);
                    setError(null);
                    setErrorTarget(null);
                  }}
                >
                  {register ? "已有账户，登录" : "使用邀请码注册"}
                </Button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
