import { useSyncExternalStore } from "react";
import tokens from "@/docs/design/tokens.json";

const medium = Number.parseFloat(tokens.layout.tokens.find(token => token.name === "breakpoint-md")!.value);
const wide = Number.parseFloat(tokens.layout.tokens.find(token => token.name === "breakpoint-lg")!.value);
export function resolveHomeLayout(width: number) { return width < medium ? "mobile" : width < wide ? "rail" : "desktop"; }
const subscribe = (notify: () => void) => { window.addEventListener("resize", notify); return () => window.removeEventListener("resize", notify); };
const snapshot = () => resolveHomeLayout(window.innerWidth);
const serverSnapshot = () => "desktop" as const;
export function useHomeLayout() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }
