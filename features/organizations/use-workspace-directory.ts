"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readWorkspaceDirectory,
  type OrganizationInvitation,
  type WorkspaceRecord,
} from "./http-organization-boundary";

export function useWorkspaceDirectory({ enabled, activeWorkspaceId, onWorkspaceChange, onWorkspaceError }: Readonly<{
  enabled: boolean;
  activeWorkspaceId?: string | null;
  onWorkspaceChange: (workspace: WorkspaceRecord | null) => void;
  onWorkspaceError: () => void;
}>) {
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceRecord[]>([]);
  const [invitations, setInvitations] = useState<readonly OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    if (!enabled) {
      setWorkspaces([]);
      setInvitations([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const directory = await readWorkspaceDirectory();
      if (request !== requestRef.current) return;
      setWorkspaces(directory.workspaces);
      setInvitations(directory.invitations);
      onWorkspaceChange(directory.workspaces.find((workspace) => activeWorkspaceId
        ? workspace.id === activeWorkspaceId : workspace.kind === "personal") ?? null);
    } catch (failure) {
      if (request !== requestRef.current) return;
      onWorkspaceError();
      setError(failure instanceof Error ? failure.message : "企业信息暂时无法读取，请重试。");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [activeWorkspaceId, enabled, onWorkspaceChange, onWorkspaceError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; };
  }, [reload]);

  return { workspaces, invitations, loading, error, reload };
}
