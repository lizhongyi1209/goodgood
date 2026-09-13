"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import { BusinessManagementView } from "./business-management-view";
import { businessStyleFixtures } from "./business-style-fixtures";

export function BusinessManagementStylePreview() {
  const [context, setContext] = useState<"enterprise" | "distributor">("enterprise");
  const [tab, setTab] = useState<"children" | "transfers">("children");
  return <div>
    <div className="business-style-preview-notice" aria-label="样式模拟">
      <div><strong>模拟数据预览</strong><span>仅查看呈现方式，不改变账户身份，也不会实际划拨积分。</span></div>
      <div className="business-style-preview-controls">
        {(["enterprise", "distributor"] as const).map((value) => <Button key={value} size="sm" variant="ghost" aria-pressed={context === value}
          onClick={() => { setContext(value); setTab("children"); }}>{value === "enterprise" ? "企业呈现" : "分销呈现"}</Button>)}
      </div>
    </div>
    <BusinessManagementView key={context} context={context} tab={tab} enabled previewData={businessStyleFixtures[context]}
      onNavigateTab={setTab} onAccountChange={() => {}} onBack={() => navigateWorkspace({ kind: "create" })} />
  </div>;
}
