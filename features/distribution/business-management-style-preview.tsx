"use client";

import { useState } from "react";
import { navigateWorkspace } from "@/features/navigation/workspace-route.mjs";
import { BusinessManagementView } from "./business-management-view";
import { businessStyleFixtures } from "./business-style-fixtures";

export function BusinessManagementStylePreview() {
  const [tab, setTab] = useState<"children" | "transfers">("children");
  return <div>
    <div className="business-style-preview-notice" aria-label="样式模拟">
      <div><strong>模拟数据预览</strong><span>仅查看呈现方式，不改变账户身份，也不会实际划拨积分。</span></div>
    </div>
    <BusinessManagementView tab={tab} enabled previewData={businessStyleFixtures.distributor}
      onNavigateTab={setTab} onAccountChange={() => {}} onBack={() => navigateWorkspace({ kind: "create" })} />
  </div>;
}
