"use client";
import { createContext, useContext } from "react";
export const CanvasGroupActionsContext = createContext({ onBeforeGraphEdit: () => {}, onProjectGraphChange: (_settled?: boolean) => {}, onUngroup: (_ids: string[]) => {} });
export const useCanvasGroupActions = () => useContext(CanvasGroupActionsContext);
