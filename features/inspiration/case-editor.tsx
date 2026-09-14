"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileAvatar } from "@/features/profile/personal-profile";
import { CaseParametersList, InspirationReadState } from "./inspiration-board";
import { CaseComparison } from "./case-comparison";
import {
  CaseComparisonSettings,
  casePublicationIssue,
} from "./case-comparison-settings";
import {
  inspirationRequest,
  type CasePreparation,
  type InspirationCase,
} from "./http-inspiration-boundary";
import "./inspiration.css";

export function CaseEditor({
  assetId,
  onCancel,
  onPublished,
}: {
  assetId: string;
  onCancel: () => void;
  onPublished: (value: InspirationCase) => void;
}) {
  const [prepared, setPrepared] = useState<CasePreparation | null>(null),
    [error, setError] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [prompt, setPrompt] = useState(""),
    [beforeId, setBeforeId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "hidden">("public"),
    [mode, setMode] = useState<"side_by_side" | "hover">("side_by_side");
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const consentRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    void inspirationRequest<CasePreparation>("/prepare", { assetId })
      .then((value) => {
        if (active) {
          setPrepared(value);
          setPrompt(value.prompt);
          setBeforeId(value.beforeOptions[0]?.id ?? "");
          setError(null);
        }
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error ? failure.message : "作品暂时不可用。",
          );
      });
    return () => {
      active = false;
    };
  }, [assetId, revision]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (title.trim() || description.trim() || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [title, description, busy]);
  async function publish() {
    if (!prepared || busy) return;
    const issue = casePublicationIssue({ consent, title, prompt });
    if (issue) {
      if (!consent) {
        setConsentError(issue);
        consentRef.current?.focus();
      } else setError(issue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const value = await inspirationRequest<InspirationCase>("", {
        assetId,
        beforeReferenceId: beforeId || null,
        title: title.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        promptVisibility: visibility,
        comparisonMode: mode,
        consent: true,
      });
      onPublished(value);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "发布失败，请重试。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="case-editor" aria-label="编辑灵感案例">
      <header className="case-page-heading">
        <button onClick={onCancel} disabled={busy}>
          <ArrowLeft size={16} />
          返回灵感板
        </button>
        <h1>编辑灵感案例</h1>
        <p>整理效果与使用方式，再发布到灵感板。</p>
      </header>
      {!prepared ? (
        <InspirationReadState
          loading={!error}
          error={error}
          onRetry={() => {
            setError(null);
            setRevision((value) => value + 1);
          }}
        />
      ) : (
        <form
          className="case-editor-layout"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <div className="case-publish-form">
            <label htmlFor="case-title">案例名称</label>
            <input
              id="case-title"
              value={title}
              placeholder="例如：高清放大图片"
              maxLength={60}
              required
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
            />
            <label htmlFor="case-description">
              效果说明 <span>选填</span>
            </label>
            <textarea
              id="case-description"
              rows={3}
              value={description}
              maxLength={1000}
              disabled={busy}
              onChange={(event) => setDescription(event.target.value)}
            />
            <label htmlFor="case-prompt">预设提示词</label>
            <textarea
              id="case-prompt"
              rows={6}
              value={prompt}
              maxLength={4000}
              required
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <p className="case-field-hint">
              可针对复刻调整提示词，不影响原作品记录。
            </p>
            <fieldset className="case-choice">
              <legend>提示词可见性</legend>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  disabled={busy}
                  onChange={() => setVisibility("public")}
                />
                <span>
                  <strong>公开提示词</strong>
                  <small>用户可以查看并修改提示词后生成。</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  value="hidden"
                  checked={visibility === "hidden"}
                  disabled={busy}
                  onChange={() => setVisibility("hidden")}
                />
                <span>
                  <strong>隐藏提示词</strong>
                  <small>用户使用预设，可补充自己的要求；补充可为空。</small>
                </span>
              </label>
            </fieldset>
            <CaseComparisonSettings
              options={prepared.beforeOptions}
              selectedId={beforeId}
              mode={mode}
              busy={busy}
              onSelect={setBeforeId}
              onMode={setMode}
            />
            <label className="case-consent" htmlFor="case-consent">
              <Checkbox
                id="case-consent"
                ref={consentRef}
                checked={consent}
                disabled={busy}
                aria-invalid={!!consentError}
                aria-describedby={
                  consentError ? "case-consent-error" : undefined
                }
                onCheckedChange={(value) => {
                  setConsent(value === true);
                  if (value === true) setConsentError(null);
                }}
              />
              <span>
                我确认发布选中的图片、参数和署名，并按所选方式提供提示词复用。
              </span>
            </label>
            {consentError && (
              <p
                id="case-consent-error"
                className="inspiration-action-error"
                role="alert"
              >
                {consentError}
              </p>
            )}
            {error && (
              <div className="inspiration-action-error" role="alert">
                {error}
              </div>
            )}
            <footer>
              <button type="button" disabled={busy} onClick={onCancel}>
                取消
              </button>
              <button className="case-use" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <LoaderCircle size={16} />
                    发布中
                  </>
                ) : (
                  "发布到灵感板"
                )}
              </button>
            </footer>
          </div>
          <aside className="case-editor-preview" aria-label="案例展示预览">
            <h2>展示预览</h2>
            <CaseComparison
              before={
                prepared.beforeOptions.find((item) => item.id === beforeId) ??
                null
              }
              after={prepared.after}
              title={title || "我的案例"}
              mode={mode}
            />
            <h3>{title || "案例名称"}</h3>
            {description && <p className="case-description">{description}</p>}
            <div className="case-author">
              <ProfileAvatar
                className="account-profile-avatar"
                name={prepared.author.displayName}
                url={prepared.author.avatarUrl}
              />
              <div>
                <strong>{prepared.author.displayName}</strong>
                {prepared.author.handle && (
                  <span>@{prepared.author.handle}</span>
                )}
              </div>
            </div>
            <h3>提示词</h3>
            {visibility === "public" ? (
              <p className="case-prompt">{prompt}</p>
            ) : (
              <p className="case-field-hint">
                预设 · 原提示词隐藏，用户只能填写补充内容
              </p>
            )}
            <h3>原作参数</h3>
            <CaseParametersList parameters={prepared.parameters} />
          </aside>
        </form>
      )}
    </section>
  );
}
