import { createContext } from "react";

export type CanvasTextGenerationContextValue = {
  enabled: boolean;
  ownerKey: string;
  pageId: string;
  workspaceId: string | null;
  beforeGenerate: () => string;
  onBillingChanged: () => void;
  onRemoveInput: (edgeId: string) => void;
  onRemoveInputs: (edgeIds: string[]) => void;
};
export const CanvasTextGenerationContext = createContext<CanvasTextGenerationContextValue>({
  enabled: false, ownerKey: "", pageId: "", workspaceId: null,
  beforeGenerate: () => { throw new Error("项目尚未同步，请稍后重试。"); }, onBillingChanged: () => {},
  onRemoveInput: () => {}, onRemoveInputs: () => {},
});
