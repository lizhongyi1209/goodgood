"use client";

import { createContext, useContext } from "react";
import type { GenerationReference } from "@/shared/contracts/generation";
import type { CanvasCropImage } from "./canvas-image-crop-image";

export const CanvasImageColorContext = createContext<Readonly<{
  enabled: boolean;
  openColor: (image: CanvasCropImage, references: readonly GenerationReference[], trigger: HTMLButtonElement) => void;
}>>({ enabled: false, openColor: () => {} });

export function useCanvasImageColor() { return useContext(CanvasImageColorContext); }
