"use client";

import { createContext, useContext } from "react";
import type { CanvasCropImage } from "./canvas-image-crop-image";

export type ImagePlacementMode = "region" | "sticker";
export const CanvasImagePlacementContext = createContext<Readonly<{
  enabled: boolean;
  regionKey: string | null;
  openPlacement: (image: CanvasCropImage, mode: ImagePlacementMode, trigger: HTMLButtonElement) => void;
}>>({ enabled: false, regionKey: null, openPlacement: () => {} });

export function useCanvasImagePlacement() { return useContext(CanvasImagePlacementContext); }
