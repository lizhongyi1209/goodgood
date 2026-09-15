"use client";

import Image from "next/image";
import { LoaderCircle, LogIn, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  initialRegistrationRequired = false,
  onAuthenticated,
  onHostedLogin,
}: {
  initialError: string | null;
  initialEmail?: string;
  initialRegistrationRequired?: boolean;
  onAuthenticated: () => Promise<void>;
  onHostedLogin: () => void;
}) {
  const [method, setMethod] = useState<"email_code" | "hosted" | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const emailRef = useRef(initialEmail);
  const [invitationCode, setInvitationCode] = useState("");
  const [registrationRequired, setRegistrationRequired] = useState(
    initialRegistrationRequired,
  );
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
            reason instanceof Error ? reason.message : "暂时不可用，请重试。",
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
    if (resendAvailableAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= resendAvailableAt) window.clearInterval(timer);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  const resendRemaining = Math.max(
    0,
    Math.ceil((resendAvailableAt - now) / 1_000),
  );

  const sendCode = async () => {
    setBusy("sending");
    setError(null);
    setErrorTarget(null);
    const snapshot = email.trim();
    try {
      const next = await requestEmailAuthenticationCode(
        snapshot,
        `${window.location.pathname}${window.location.search}`,
      );
      const sentAt = Date.now();
      setNow(sentAt);
      setResendAvailableAt(sentAt + next.resendAfterSeconds * 1_000);
      if (emailRef.current.trim().toLowerCase() !== snapshot.toLowerCase())
        return;
      setChallenge(next);
      setCode("");
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
        registrationRequired ? invitationCode : undefined,
        email,
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
        setRegistrationRequired(true);
        setErrorTarget("invitation");
      } else setErrorTarget("code");
    } finally {
      setBusy(null);
    }
  };

  const updateEmail = (value: string) => {
    const changed =
      emailRef.current.trim().toLowerCase() !== value.trim().toLowerCase();
    emailRef.current = value;
    setEmail(value);
    setError(null);
    setErrorTarget(null);
    if (changed) {
      setChallenge(null);
      setCode("");
      setInvitationCode("");
      setRegistrationRequired(initialRegistrationRequired);
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
        ? `${resendRemaining}s`
        : challenge
          ? "重发"
          : "发送验证码";

  if (busy === "loading" && method === null) {
    return (
      <div className="authentication-gate" role="status" aria-label="加载中">
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
            <h2 id="authentication-title">登录</h2>

            {error && (
              <div className="authentication-error" role="alert">
                {error}
              </div>
            )}
            <button className="authentication-submit" onClick={onHostedLogin}>
              <LogIn size={16} />
              确认
            </button>
          </>
        ) : (
          <>
            <h2 className="authentication-mode-title" id="authentication-title">
              {registrationRequired ? "注册" : "登录"}
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
                    disabled={busy === "verifying"}
                    id="authentication-email"
                    inputMode="email"
                    maxLength={320}
                    onChange={(event) => updateEmail(event.target.value)}
                    placeholder="邮箱"
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
                    aria-label="邮箱验证码"
                    autoComplete="one-time-code"
                    className="authentication-code-input"
                    disabled={!challenge || busy !== null}
                    id="authentication-code"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => updateCode(event.target.value)}
                    pattern="[0-9]{6}"
                    placeholder="验证码"
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

              {registrationRequired && (
                <div className="authentication-invitation-field">
                  <span className="authentication-input-shell">
                    <ShieldCheck aria-hidden="true" size={16} />
                    <Input
                      aria-label="邀请码"
                      aria-invalid={errorTarget === "invitation"}
                      autoComplete="off"
                      className="authentication-invitation-input"
                      disabled={busy !== null}
                      id="authentication-invitation"
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) => {
                        setInvitationCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        if (errorTarget === "invitation") {
                          setError(null);
                          setErrorTarget(null);
                        }
                      }}
                      pattern="[0-9]{6}"
                      placeholder="邀请码"
                      type="text"
                      value={invitationCode}
                    />
                  </span>
                </div>
              )}
              {challenge?.delivery === "unknown" && (
                <div className="authentication-notice">
                  发送状态待确认，请稍后重试。
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
                  (registrationRequired && invitationCode.length !== 6) ||
                  !email.trim()
                }
                type="submit"
              >
                {busy === "verifying" && (
                  <LoaderCircle className="animate-spin" />
                )}
                {busy === "verifying" ? "验证中" : "确认"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
