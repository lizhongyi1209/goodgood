import { createContext } from "react";

export const CanvasGeneratorHostContext = createContext<
  (id: string, element: HTMLDivElement | null) => void
>(() => {});
