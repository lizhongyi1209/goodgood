"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

type Invitation = {
  id: string;
  hint: string;
  status: "available" | "used" | "revoked";
  createdAt: string;
  usedAt: string | null;
};
type InvitationList = {
  items: Invitation[];
  counts: { available: number; used: number; revoked: number };
};
const labels = { available: "未使用", used: "已使用", revoked: "已停用" };
async function request<T = unknown>(
  action: string,
  input: object = {},
  key?: string,
) {
  const response = await goodGoodApiFetch(`/api/admin/invitations/${action}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-goodgood-admin-action": "1",
      ...(key ? { "idempotency-key": key } : {}),
    },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as { error?: { message?: string } };
  if (!response.ok)
    throw Error(data.error?.message ?? "邀请码暂时不可用，请重试。");
  return data as T;
}
export function InvitationManagement() {
  const [open, setOpen] = useState(false),
    [list, setList] = useState<InvitationList | null>(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const key = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await request<InvitationList>("query");
        if (current) setList(data);
      } catch (e) {
        if (current)
          setError(e instanceof Error ? e.message : "读取失败，请重试。");
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [open, revision]);
  const create = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    key.current ??= `invitation-${crypto.randomUUID()}`;
    try {
      const data = await request<{
        code: string | null;
        replayed: boolean;
        invitation: Invitation;
      }>("create", {}, key.current);
      setCode(data.code);
      setNotice(
        data.replayed
          ? `末6位 ${data.invitation.hint} 的邀请码已生成，明文无法再次显示。请停用对应未使用码，再生成新码。`
          : "每个邀请码限注册1人。请复制保存，关闭后无法再次查看明文。",
      );
      key.current = null;
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试。");
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await request("revoke", { id });
      setNotice("邀请码已停用。");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "停用失败，请重试。");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <KeyRound size={16} />
        邀请码
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            setOpen(next);
            if (!next) {
              setCode(null);
              setNotice("");
            }
          }
        }}
      >
        <DialogContent className="admin-action-dialog">
          <DialogHeader>
            <DialogTitle>注册邀请码</DialogTitle>
            <DialogDescription>
              每码限注册1人，邮箱验证通过后直接开通账户。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={busy || loading} onClick={() => void create()}>
                {busy && <LoaderCircle className="animate-spin" />}生成邀请码
              </Button>
              <Button
                variant="ghost"
                aria-label="刷新邀请码"
                disabled={busy || loading}
                onClick={() => setRevision((v) => v + 1)}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
            {code && (
              <div className="rounded-xl bg-zinc-50 p-4">
                <code className="block break-all text-sm select-all">
                  {code}
                </code>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(code)
                      .then(() => setNotice("邀请码已复制，请保存。"))
                      .catch(() => setError("复制失败，请选择邀请码手动复制。"))
                  }
                >
                  <Copy size={16} />
                  复制邀请码
                </Button>
              </div>
            )}
            {notice && (
              <p className="text-sm text-zinc-500" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="text-sm text-primary" role="alert">
                {error}
              </p>
            )}
            {loading ? (
              <p role="status" className="text-sm text-zinc-500">
                正在读取邀请码
              </p>
            ) : (
              list && (
                <>
                  <p className="text-sm text-zinc-500">
                    未使用 {list.counts.available} · 已使用 {list.counts.used} ·
                    已停用 {list.counts.revoked}
                  </p>
                  {!list.items.length ? (
                    <p className="text-sm text-zinc-500">
                      暂无邀请码，生成后即可邀请用户注册。
                    </p>
                  ) : (
                    <ul className="space-y-2" aria-label="最近100个邀请码">
                      {list.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3"
                        >
                          <div>
                            <span className="text-sm">
                              •••• {item.hint} · {labels[item.status]}
                            </span>
                            <time className="mt-1 block text-xs text-zinc-500">
                              {new Date(item.createdAt).toLocaleString("zh-CN")}
                            </time>
                          </div>
                          {item.status === "available" && (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => void revoke(item.id)}
                            >
                              停用
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
