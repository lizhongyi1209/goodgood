"use client";

import { useEffect, useRef } from "react";

export function parameterDrawerViewportHeight(viewportHeight: number, composerBottom: number) {
  return Math.max(0, viewportHeight - composerBottom - 12);
}

/** Keep attached settings reachable without adding any height to the result flow. */
export function useParameterDrawerViewport(open: boolean) {
  const composerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const composer = composerRef.current;
    if (!open || !composer) return;

    const updateHeight = () => {
      const height = parameterDrawerViewportHeight(
        window.innerHeight,
        composer.getBoundingClientRect().bottom,
      );
      composer.style.setProperty("--parameter-drawer-max-height", `${height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(composer);
    window.addEventListener("resize", updateHeight);
    window.addEventListener("scroll", updateHeight, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("scroll", updateHeight);
    };
  }, [open]);

  return composerRef;
}
