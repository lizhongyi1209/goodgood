"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const OFFLINE_TOAST_ID = "gg-create-offline";

export function useOfflineNotice() {
  useEffect(() => {
    const showOffline = () => toast.loading("正在重新连接…", { id: OFFLINE_TOAST_ID, duration: Infinity });
    const showOnline = () => { toast.dismiss(OFFLINE_TOAST_ID); };
    if (!navigator.onLine) showOffline();
    window.addEventListener("offline", showOffline);
    window.addEventListener("online", showOnline);
    return () => {
      window.removeEventListener("offline", showOffline);
      window.removeEventListener("online", showOnline);
      toast.dismiss(OFFLINE_TOAST_ID);
    };
  }, []);
}
