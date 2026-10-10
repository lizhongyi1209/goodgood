"use client";

import type { ReactNode } from "react";
import tokens from "@/docs/design/tokens.json";
import { Tooltip as PrimitiveTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import styles from "./design-system.module.css";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const delay = Number.parseFloat(tokens.homepage.tokens.find(token => token.name === "preview-duration")!.value);
  return <TooltipProvider delayDuration={delay}><PrimitiveTooltip><TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent className={styles.tooltip}>{label}</TooltipContent>
  </PrimitiveTooltip></TooltipProvider>;
}
