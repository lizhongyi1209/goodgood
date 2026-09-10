"use client";

import { Building2, Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  acceptOrganizationInvitation,
  readWorkspaceDirectory,
  type OrganizationInvitation,
  type WorkspaceRecord,
} from "./http-organization-boundary";

type WorkspaceSwitcherProps = Readonly<{
  activeWorkspaceId?: string | null;
  enabled: boolean;
  onWorkspaceChange?: (workspace: WorkspaceRecord | null) => void;
  onWorkspaceError?: () => void;
}>;

export function WorkspaceSwitcher({
  activeWorkspaceId = null,
  enabled,
  onWorkspaceChange,
  onWorkspaceError,
}: WorkspaceSwitcherProps) {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceRecord[]>([]);
  const [invitations, setInvitations] = useState<readonly OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const directory = await readWorkspaceDirectory();
      setWorkspaces(directory.workspaces);
      setInvitations(directory.invitations);
    } catch (loadError) {
      onWorkspaceError?.();
      setError(
        loadError instanceof Error
          ? loadError.message
          : "工作区暂时无法读取，请重试。",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, onWorkspaceError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const personalWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.kind === "personal") ?? null,
    [workspaces],
  );
  const activeWorkspace = useMemo(
    () =>
      activeWorkspaceId
        ? workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null
        : personalWorkspace,
    [activeWorkspaceId, personalWorkspace, workspaces],
  );

  useEffect(() => {
    if (!enabled || loading || error) return;
    onWorkspaceChange?.(activeWorkspace);
  }, [activeWorkspace, enabled, error, loading, onWorkspaceChange]);

  const selectWorkspace = (workspaceId: string) => {
    const selected = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!selected || selected.membershipStatus === "suspended") return;
    window.location.assign(
      selected.kind === "personal"
        ? "/create"
        : `/workspaces/${encodeURIComponent(selected.id)}/create`,
    );
  };

  const acceptInvitation = async (invitation: OrganizationInvitation) => {
    setAcceptingId(invitation.id);
    setError(null);
    try {
      await acceptOrganizationInvitation(invitation.id);
      await load();
      window.location.assign(
        `/workspaces/${encodeURIComponent(invitation.workspaceId)}/create`,
      );
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "邀请暂时无法接受，请重试。",
      );
    } finally {
      setAcceptingId(null);
    }
  };

  if (!enabled) return null;

  return (
    <section className="workspace-switcher" aria-label="当前工作区">
      {loading ? (
        <div className="workspace-switcher-state" role="status">
          <LoaderCircle className="animate-spin" size={14} />读取工作区
        </div>
      ) : error && workspaces.length === 0 ? (
        <button className="workspace-switcher-state is-error" onClick={() => void load()}>
          <RefreshCw size={14} />工作区重试
        </button>
      ) : (
        <Select value={activeWorkspace?.id ?? ""} onValueChange={selectWorkspace}>
          <SelectTrigger className="workspace-switcher-trigger" aria-label="切换工作区">
            <Building2 size={15} />
            <SelectValue placeholder="选择工作区" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem
                disabled={workspace.membershipStatus === "suspended"}
                key={workspace.id}
                value={workspace.id}
              >
                {workspace.name}
                {workspace.membershipStatus === "suspended" ? "（已暂停）" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activeWorkspace?.kind === "organization" &&
        activeWorkspace.membershipStatus === "active" && (
          <div className="workspace-switcher-meta">
            <span>
              剩余额度 {activeWorkspace.credit?.budget?.remainingCredits ?? "0"}
            </span>
            {(activeWorkspace.role === "org_owner" ||
              activeWorkspace.role === "org_admin") && (
              <a href={`/organizations/${encodeURIComponent(activeWorkspace.id)}`}>
                企业管理
              </a>
            )}
          </div>
        )}

      {invitations.slice(0, 1).map((invitation) => (
        <div className="workspace-invitation" key={invitation.id}>
          <span>{invitation.workspaceName ?? "企业工作区"} 邀请你加入</span>
          <button
            disabled={acceptingId === invitation.id}
            onClick={() => void acceptInvitation(invitation)}
          >
            {acceptingId === invitation.id ? (
              <LoaderCircle className="animate-spin" size={12} />
            ) : (
              <Check size={12} />
            )}
            接受
          </button>
        </div>
      ))}
      {error && workspaces.length > 0 && (
        <button className="workspace-switcher-inline-error" onClick={() => void load()}>
          {error} · 重试
        </button>
      )}
    </section>
  );
}
