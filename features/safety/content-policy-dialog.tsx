"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ContentPolicyState } from "./http-content-safety-boundary";

export function ContentPolicyDialog({
  acknowledged,
  busy,
  error,
  loading,
  onAccept,
  onAcknowledgedChange,
  onOpenChange,
  onRetry,
  open,
  required,
  state,
}: Readonly<{
  acknowledged: boolean;
  busy: boolean;
  error: string | null;
  loading: boolean;
  onAccept: () => void;
  onAcknowledgedChange: (checked: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  open: boolean;
  required: boolean;
  state: ContentPolicyState | null;
}>) {
  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!required || next) onOpenChange(next);
    }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onEscapeKeyDown={(event) => required && event.preventDefault()}
        onInteractOutside={(event) => required && event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle>{state?.policy.title ?? "GoodGood 内测使用规则"}</DialogTitle>
          <DialogDescription>
            {required
              ? "首次创作前请阅读并同意当前版本。账户审核和积分不会代替这一步。"
              : `当前版本 ${state?.policy.version ?? "--"}${state?.acceptedAt ? ` · 已于 ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(state.acceptedAt))} 同意` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-zinc-500" role="status">
            <LoaderCircle className="size-4 animate-spin" />正在读取使用规则
          </div>
        ) : error ? (
          <div className="grid gap-3">
            <Alert variant="destructive">
              <AlertTitle>使用规则暂时无法读取</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" onClick={onRetry}>重新读取</Button>
          </div>
        ) : state ? (
          <div className="grid gap-5 text-sm leading-6 text-zinc-700">
            <section>
              <h3 className="font-semibold text-zinc-950">禁止内容</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.policy.prohibited.map((item) => <li key={item.code}>{item.label}</li>)}
              </ul>
            </section>
            <section>
              <h3 className="font-semibold text-zinc-950">你的责任</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {state.policy.obligations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <Alert>
              <ShieldCheck />
              <AlertTitle>当前内测处理方式</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-5">
                  {state.policy.response.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
            {required && (
              <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4">
                <Checkbox
                  id="content-policy-acknowledgement"
                  checked={acknowledged}
                  disabled={busy}
                  onCheckedChange={(checked) => onAcknowledgedChange(checked === true)}
                />
                <Label htmlFor="content-policy-acknowledgement" className="items-start leading-5">
                  我已阅读并同意遵守以上规则，且理解违规内容可能被隔离或删除，账户可能被暂停。
                </Label>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          {!required && <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>}
          {required && (
            <Button disabled={busy || loading || Boolean(error) || !acknowledged || !state} onClick={onAccept}>
              {busy && <LoaderCircle className="animate-spin" />}同意并进入工作台
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
