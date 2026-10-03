"use client";

import { createContext, useContext } from "react";
import type { CanvasCropImage } from "./canvas-image-crop-image";

// Keep the provider and toolbar on the same context when the editor refreshes.
export const CanvasImageMetadataContext = createContext<Readonly<{
  enabled: boolean;
  openMetadata: (image: CanvasCropImage, trigger: HTMLButtonElement) => void;
}>>({ enabled: false, openMetadata: () => {} });

export function useCanvasImageMetadata() { return useContext(CanvasImageMetadataContext); }
