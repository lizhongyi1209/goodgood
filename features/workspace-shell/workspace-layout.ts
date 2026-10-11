import { useSyncExternalStore } from "react";
import tokens from "@/docs/design/tokens.json";

const medium = Number.parseFloat(tokens.layout.tokens.find((token) => token.name === "breakpoint-md")!.value);
const wide = Number.parseFloat(tokens.layout.tokens.find((token) => token.name === "breakpoint-lg")!.value);

export function resolveWorkspaceLayout(width: number) {
  return width < medium ? "mobile" : width < wide ? "rail" : "desktop";
}

const subscribe = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const snapshot = () => resolveWorkspaceLayout(window.innerWidth);
const serverSnapshot = () => "desktop" as const;

export function useWorkspaceLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
