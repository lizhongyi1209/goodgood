import { createHash } from "node:crypto";

export const CONTENT_POLICY_VERSION = "seed-v1";

const POLICY_BODY = Object.freeze({
  obligations: Object.freeze([
    "只提交你有权使用的提示词和参考图。",
    "不得利用生成结果伤害、欺骗、骚扰他人或规避适用法律法规。",
    "发现不当结果时，请通过图片详情立即举报；举报会先隐藏该图片。",
  ]),
  prohibited: Object.freeze([
    Object.freeze({ code: "child_safety", label: "涉及未成年人的性剥削或性化内容" }),
    Object.freeze({ code: "non_consensual_intimate", label: "未经同意的私密影像或性化换脸" }),
    Object.freeze({ code: "fraud_impersonation", label: "诈骗、身份冒用或会造成实际伤害的仿冒" }),
    Object.freeze({ code: "extremism_violence", label: "极端主义、恐怖主义宣传或无必要的血腥暴力" }),
    Object.freeze({ code: "illegal_activity", label: "明确用于实施违法活动的内容" }),
    Object.freeze({ code: "privacy_ip", label: "侵犯他人隐私、肖像或知识产权的内容" }),
  ]),
  response: Object.freeze([
    "GoodGood 会保留上游模型的默认安全拦截。",
    "站长可隔离或删除具体图片，并可暂停相关账户。",
    "当前内测不使用本地关键词过滤或第三方语义审核服务。",
  ]),
  title: "GoodGood 内测使用规则",
});

export const CONTENT_POLICY_DOCUMENT_HASH = createHash("sha256")
  .update(JSON.stringify(POLICY_BODY))
  .digest("hex");

export const CONTENT_POLICY = Object.freeze({
  ...POLICY_BODY,
  documentHash: CONTENT_POLICY_DOCUMENT_HASH,
  version: CONTENT_POLICY_VERSION,
});

export const CONTENT_REPORT_CATEGORIES = Object.freeze([
  ...POLICY_BODY.prohibited,
  Object.freeze({ code: "other", label: "其他违反使用规则的内容" }),
]);
