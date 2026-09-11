"use client";

import Image from "next/image";
import { LoaderCircle, LogIn, Mail } from "lucide-react";
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
  const [errorTarget, setErrorTarget] = useState<"email" | "code" | "general" | null>(
    initialError ? "general" : null,
  );
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
      setError(reason instanceof Error ? reason.message : "验证码邮件暂时无法发送，请稍后重试。");
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
      await verifyEmailAuthenticationCode(challenge.id, code);
      await onAuthenticated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "验证码无效或已过期，请重新获取。");
      setErrorTarget("code");
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
    setCode(value);
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
          : "获取验证码";

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
        ) : (
          <>
            <p>输入邮箱获取六位验证码，填写后即可登录。首次验证成功会自动注册。</p>
            <form
              className="authentication-form"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCode();
              }}
            >
              <div className="authentication-field-label">
                <span className="authentication-field-heading">
                  <label htmlFor="authentication-email">邮箱</label>
                  {challenge && requestedEmail && (
                    <button
                      className="authentication-edit-email"
                      disabled={busy !== null}
                      onClick={editEmail}
                      type="button"
                    >
                      修改邮箱
                    </button>
                  )}
                </span>
                <div className="authentication-email-row">
                  <span className="authentication-input-shell">
                    <Mail aria-hidden="true" size={17} />
                    <Input
                      aria-invalid={errorTarget === "email"}
                      autoComplete="email"
                      autoFocus
                      className="authentication-email-input"
                      disabled={busy !== null || Boolean(challenge && requestedEmail)}
                      id="authentication-email"
                      inputMode="email"
                      maxLength={320}
                      onChange={(event) => updateEmail(event.target.value)}
                      placeholder={challenge ? challenge.emailHint : "name@example.com"}
                      type="email"
                      value={email}
                    />
                  </span>
                  <Button
                    aria-live="polite"
                    className="authentication-send-code"
                    disabled={busy !== null || !email.trim() || resendRemaining > 0}
                    onClick={() => void sendCode()}
                    type="button"
                    variant="secondary"
                  >
                    {busy === "sending" && <LoaderCircle className="animate-spin" />}
                    {sendCodeLabel}
                  </Button>
                </div>
              </div>

              {challenge && (
                <p className="authentication-delivery" role="status">
                  验证码已提交发送至 <strong>{challenge.emailHint}</strong>，请检查收件箱和垃圾邮件。
                </p>
              )}

              <div className="authentication-code-field">
                <span className="authentication-field-heading">验证码</span>
                <div className="authentication-code-wrap">
                  <InputOTP
                    aria-label="六位登录验证码"
                    autoComplete="one-time-code"
                    containerClassName="authentication-code-control"
                    disabled={!challenge || busy !== null}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={updateCode}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={code}
                  >
                    <InputOTPGroup className="authentication-code-group">
                      {Array.from({ length: 6 }, (_, index) => (
                        <InputOTPSlot
                          aria-invalid={errorTarget === "code"}
                          className="authentication-code-slot"
                          index={index}
                          key={index}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {challenge?.delivery === "unknown" && (
                <div className="authentication-notice">
                  发信结果暂未确认，请稍等片刻；收到的当前验证码仍可尝试。
                </div>
              )}
              {error && <div className="authentication-error" role="alert">{error}</div>}
              <Button
                className="authentication-submit"
                disabled={busy !== null || !challenge || code.length !== 6}
                type="submit"
              >
                {busy === "verifying" ? <LoaderCircle className="animate-spin" /> : <LogIn />}
                {busy === "verifying" ? "正在登录" : "登录"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
