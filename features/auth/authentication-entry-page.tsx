"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthenticationGate } from "./authentication-gate";
import {
  authenticationEntryPath,
  safeAuthenticationReturnTo,
  type AuthenticationMode,
} from "./authentication-navigation";
import {
  authenticationErrorMessage,
  beginAuthentication,
  readAuthenticationSession,
} from "./http-auth-boundary";

export function AuthenticationEntryPage({ mode }: { mode: AuthenticationMode }) {
  const [ready, setReady] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [entry] = useState(() => {
    if (typeof window === "undefined") {
      return { initialError: null, returnTo: "/create" };
    }
    const url = new URL(window.location.href);
    return {
      initialError: authenticationErrorMessage(url.searchParams.get("authError")),
      returnTo: safeAuthenticationReturnTo(url.searchParams.get("returnTo")),
    };
  });
  const [initialError, setInitialError] = useState<string | null>(
    entry.initialError,
  );
  const returnTo = entry.returnTo;

  useEffect(() => {
    let active = true;

    void readAuthenticationSession()
      .then((session) => {
        if (!active) return;
        if (session?.access.status === "pending") {
          if (mode === "login") {
            window.location.replace(authenticationEntryPath("register", returnTo));
            return;
          }
          setAccountEmail(session.user.email ?? "");
          setReady(true);
          return;
        }
        if (session) {
          window.location.replace(returnTo);
          return;
        }
        setReady(true);
      })
      .catch((reason) => {
        if (!active) return;
        setInitialError(
          reason instanceof Error ? reason.message : "登录状态暂时无法读取，请重试。",
        );
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [mode, returnTo]);

  if (!ready) {
    return (
      <main className="authentication-gate" role="status" aria-label="正在确认登录状态">
        <div className="authentication-card authentication-loading">
          <LoaderCircle aria-hidden="true" />
          <span>正在确认登录状态</span>
        </div>
      </main>
    );
  }

  return (
    <main>
      <AuthenticationGate
        entryPage
        initialEmail={accountEmail}
        initialError={initialError}
        initialMode={mode}
        onAuthenticated={async (verifiedReturnTo) => {
          const session = await readAuthenticationSession();
          if (!session) throw new Error("登录状态尚未建立，请重新输入验证码。");
          window.location.assign(
            safeAuthenticationReturnTo(verifiedReturnTo, returnTo),
          );
        }}
        onHostedLogin={() => beginAuthentication(returnTo)}
        onModeChange={(nextMode) => {
          window.history.replaceState(
            null,
            "",
            authenticationEntryPath(nextMode, returnTo),
          );
        }}
        returnTo={returnTo}
      />
    </main>
  );
}
