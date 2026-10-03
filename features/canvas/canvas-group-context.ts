"use client";
import { createContext, useContext } from "react";
export const CanvasGroupActionsContext = createContext({ onBeforeGraphEdit: () => {}, onProjectGraphChange: (_settled?: boolean) => {} });
export const useCanvasGroupActions = () => useContext(CanvasGroupActionsContext);
