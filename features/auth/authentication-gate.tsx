"use client";

import Image from "next/image";
import { ArrowLeft, LoaderCircle, LogIn, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  readAuthenticationMethod,
  readEmailAuthenticationChallenge,
  requestEmailAuthenticationCode,
  verifyEmailAuthenticationCode,
  type EmailAuthenticationChallenge,
} from "./http-auth-boundary";

export function AuthenticationGate({
  initialError,
  onAuthenticated,
  onHostedLogin,
}: {
  initialError: string | null;
  onAuthenticated: () => Promise<void>;
  onHostedLogin: () => void;
}) {
  const [method, setMethod] = useState<"email_code" | "hosted" | null>(null);
  const [email, setEmail] = useState("");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<EmailAuthenticationChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
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
          setError(reason instanceof Error ? reason.message : "登录方式暂时无法确认，请重试。");
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
      setError(reason instanceof Error ? reason.message : "验证码邮件暂时无法发送，请稍后重试。");
    } finally {
      setBusy(null);
    }
  };

  const verifyCode = async () => {
    if (!challenge) return;
    setBusy("verifying");
    setError(null);
    try {
      await verifyEmailAuthenticationCode(challenge.id, code);
      await onAuthenticated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "验证码无效或已过期，请重新获取。");
    } finally {
      setBusy(null);
    }
  };

  const editEmail = () => {
    setChallenge(null);
    setCode("");
    setError(null);
  };

  if (busy === "loading" && method === null) {
    return (
      <div className="authentication-gate" role="status" aria-label="正在读取登录方式">
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
          <div className="authentication-brand" role="img" aria-label="GoodGood">
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
        <div className="authentication-brand" role="img" aria-label="GoodGood">
          <Image src="/goodgood-mark.svg" alt="" width={29} height={22} />
          <Image src="/goodgood-wordmark.svg" alt="" width={89} height={20} />
        </div>
        <h2 id="authentication-title">登录后继续创作</h2>
        {method === "hosted" ? (
          <>
            <p>使用 Google 账号或邮箱验证码。首次登录会自动注册，无需设置密码。</p>
            {error && <div className="authentication-error" role="alert">{error}</div>}
            <button className="authentication-submit" onClick={onHostedLogin}>
              <LogIn size={16} />
              Google / 邮箱验证码登录
            </button>
          </>
        ) : challenge ? (
          <>
            <p>
              验证码已提交发送至 <strong>{challenge.emailHint}</strong>。请检查收件箱和垃圾邮件。
            </p>
            {challenge.delivery === "unknown" && (
              <div className="authentication-notice">
                发信结果暂未确认，请稍等片刻；收到的当前验证码仍可尝试。
              </div>
            )}
            <div className="authentication-code-wrap">
              <InputOTP
                aria-label="六位登录验证码"
                autoComplete="one-time-code"
                containerClassName="authentication-code-control"
                disabled={busy !== null}
                inputMode="numeric"
                maxLength={6}
                onChange={setCode}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
              >
                <InputOTPGroup className="authentication-code-group">
                  {Array.from({ length: 6 }, (_, index) => (
                    <InputOTPSlot
                      aria-invalid={Boolean(error)}
                      className="authentication-code-slot"
                      index={index}
                      key={index}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && <div className="authentication-error" role="alert">{error}</div>}
            <Button
              className="authentication-submit"
              disabled={busy !== null || code.length !== 6}
              onClick={() => void verifyCode()}
            >
              {busy === "verifying" ? <LoaderCircle className="animate-spin" /> : <LogIn />}
              {busy === "verifying" ? "正在登录" : "登录"}
            </Button>
            <div className="authentication-secondary-actions">
              <Button
                className="authentication-secondary"
                size="sm"
                variant="ghost"
                onClick={editEmail}
                disabled={busy !== null}
              >
                <ArrowLeft />修改邮箱
              </Button>
              {requestedEmail ? (
                <Button
                  className="authentication-secondary"
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null || resendRemaining > 0}
                  onClick={() => void sendCode()}
                >
                  {busy === "sending"
                    ? "正在发送"
                    : resendRemaining > 0
                      ? `${resendRemaining} 秒后重发`
                      : "重新发送"}
                </Button>
              ) : (
                <span className="authentication-secondary-hint">如需重发，请重新输入完整邮箱</span>
              )}
            </div>
          </>
        ) : (
          <>
            <p>输入邮箱获取六位验证码。首次验证成功会自动注册，无需设置密码。</p>
            <label className="authentication-field-label">
              <span>邮箱</span>
              <div className="authentication-input-shell">
                <Mail aria-hidden="true" size={17} />
                <Input
                  aria-invalid={Boolean(error)}
                  autoComplete="email"
                  autoFocus
                  className="authentication-email-input"
                  disabled={busy !== null}
                  inputMode="email"
                  maxLength={320}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </div>
            </label>
            {error && <div className="authentication-error" role="alert">{error}</div>}
            <Button
              className="authentication-submit"
              disabled={busy !== null || !email.trim()}
              onClick={() => void sendCode()}
            >
              {busy === "sending" ? <LoaderCircle className="animate-spin" /> : <Mail />}
              {busy === "sending" ? "正在发送" : "获取验证码"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
