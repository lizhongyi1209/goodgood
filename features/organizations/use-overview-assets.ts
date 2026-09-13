"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readOrganizationAssets, type OrganizationAssetBatch } from "./http-organization-boundary";

export function useOverviewAssets(workspaceId: string) {
  const [batches, setBatches] = useState<readonly OrganizationAssetBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await readOrganizationAssets(workspaceId);
      if (request !== requestRef.current) return;
      setBatches(result.batches);
    } catch (failure) {
      if (request !== requestRef.current) return;
      setError(failure instanceof Error ? failure.message : "最近成品暂时无法读取，请重试。");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [workspaceId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; };
  }, [reload]);
  return { batches, loading, error, reload };
}
