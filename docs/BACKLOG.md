# 当前任务与优先级

最后同步：2026-09-12。这里是索引，细节以任务卡为准；不是自动执行所有项目的授权。

## 当前与最近交付

| ID | 事项 | 状态 | 入口 |
| --- | --- | --- | --- |
| GG-001 | 项目记忆精简、交接协议、历史 C6 隔离 | 已完成（不需上线） | [任务](tasks/GG-001-project-continuity.md) |
| GG-002 | Nano Banana 2 全宽高比/分辨率 | 已上线 | [发布记录](releases/2026-09-07-banana-2-parameters.md) |
| GG-003 | 将 alpha 发布门禁从历史快照独立提取 | 已上线并以精确候选通过 | [任务](tasks/GG-003-alpha-release-tooling.md) |
| GG-004 | 修复重复投递导致生成结果丢失 | 已上线；真实 Nano 冒烟通过 | [任务](tasks/GG-004-generation-dispatch-race.md) |
| GG-005 | 分辨率改为 1K/2K/4K，并展示资产实际像素 | 已上线 | [任务](tasks/GG-005-resolution-metadata.md) |
| GG-006 | 放大 1:1 参考图预览并将画面比例移到左侧 | 已上线 | [任务](tasks/GG-006-reference-tray-layout.md) |
| GG-007 | GPT IMAGE 2 SD 精确尺寸、真实生成与三档 10 积分 | 已上线；本次未新增 GPT 冒烟 | [任务](tasks/GG-007-gpt-image-2-sd.md) |
| GG-008 | 生成按钮支持连续并行提交 | 已上线 | [任务](tasks/GG-008-parallel-generation.md) |
| GG-009 | GPT IMAGE 2 开放 2 / 4 张输出，每张 10 积分 | 已上线 | [任务](tasks/GG-009-gpt-image-output-counts.md) |
| GG-010 | Nano Banana 2 开放 2 / 4 张编排输出，每张 10 积分 | 已上线 | [任务](tasks/GG-010-banana-multi-output.md) |
| GG-011 | 固化快速交付与真实 provider 测试隔离规则 | 已完成（不需上线） | [任务](tasks/GG-011-fast-safe-local-delivery.md) |
| GG-012 | Nano Banana 2 Google Search 与文本/图片响应模态 | 已上线；思考 UI 由 GG-016 取代 | [任务](tasks/GG-012-banana-thinking-search.md) |
| GG-013 | 稳定生成网格、实际尺寸与本地下载 | 已上线 | [任务](tasks/GG-013-stable-generation-grid-download.md) |
| GG-014 | 精简左下角积分余额 | 已上线 | [任务](tasks/GG-014-sidebar-balance-copy.md) |
| GG-015 | GPT IMAGE 2 质量、背景与输出格式 | 已上线；透明输出仍可人工验收 | [任务](tasks/GG-015-gpt-image-options.md) |
| GG-016 | Nano Banana 2 隐藏并固定高思考 | 已上线；真实 Nano 冒烟通过 | [任务](tasks/GG-016-banana-hidden-high-thinking.md) |
| GG-017 | 上传参考图沉淀为可复用素材 | 已上线；生产边界验证通过 | [任务](tasks/GG-017-reusable-reference-library.md) |
| GG-018 | 参考图拖拽排序并显示图号 | 已上线 | [任务](tasks/GG-018-reference-ordering.md) |
| GG-019 | 参考图完整大图与精简删除按钮 | 已上线 | [任务](tasks/GG-019-reference-large-preview.md) |
| GG-020 | 参考图裁剪、画笔、贴图、箭头与 bbox 编辑 | 已上线；移动端触控仍可人工复核 | [任务](tasks/GG-020-reference-quick-editor.md) |
| GG-021 | Nano Banana Pro 单张定价 15 积分 | 已上线报价；生成路由仍关闭 | [任务](tasks/GG-021-nano-banana-pro-pricing.md) |
| GG-022 | 修复 alpha 后续发布的隔离恢复演练 | 已上线并通过真实恢复/发布验收 | [任务](tasks/GG-022-ongoing-production-restore.md) |
| GG-023 | 升级 Sharp 以修复新识别的 HIGH 漏洞 | 安全镜像 CI 通过；待新生产/冒烟授权 | [任务](tasks/GG-023-sharp-security-update.md) |
| GG-024 | 修复站长账户管理弹框与列表操作样式 | 已合入 GG-026；待整体验收 | [任务](tasks/GG-024-admin-dialog-styles.md) |
| GG-025 | 用户积分记录页与只读账本投影 | 已合入 GG-026；待整体验收 | [任务](tasks/GG-025-credit-activity.md) |
| GG-026 | 合并账户管理与积分记录并整合本地预览环境 | 本地整合与单环境验收完成；待用户验收 | [任务](tasks/GG-026-local-feature-integration.md) |
| GG-027 | 企业/分销身份、直属下级与充值来源积分划拨 | 本地完成；账户身份、菜单、筛选与无边框普通按钮规范已复验，待用户决定是否发布准备 | [任务](tasks/GG-027-distributor-credit-transfers.md) |
| GG-028 | Authing 自定义域名和浏览器 Google | 被 GG-029 取代；原未发布分支保留，不继续配置 | 原提交 `81ed8ae`；[后续决策](decisions/0045-goodgood-owned-email-otp.md) |
| GG-029 | 自建邮箱验证码登录，Google 延后 | P0 真信/真实应用登录闭环及 P1/P2/P3 本地代码完成；单页登录视觉与合成浏览器闭环已复验；发布前外部证据、生产演练与 P4 待完成，未部署 | [任务](tasks/GG-029-email-otp-plan.md) / [方案](EMAIL_AUTH_PLAN.md) |
| GG-030 | 企业工作区、员工额度、消费记录和资产审阅 | 阶段 0—4 本地完成并验证；未合入/未部署 | [任务](tasks/GG-030-enterprise-workspace.md) |
| GG-031 | 邮箱验证码与企业工作区本地集成 | 自动化完成，并已在 GG-032 完整基线上复验通过；线上未开始 | [任务](tasks/GG-031-email-enterprise-integration.md) |
| GG-032 | 完整基础、邮箱验证码与企业工作区整合 | 完整本地组合验收完成，待用户确认；未合入/未部署 | [任务](tasks/GG-032-complete-base-email-enterprise.md) |

GG-024—GG-032 已由隔离任务占用；下一个普通产品需求从 **GG-033** 分配并检查是否已被占用。每次 alpha 发布仍须取得
新鲜、精确绑定候选的证据并通过门禁；本次证据不能复用。
完整发布证据见[累计发布记录](releases/2026-09-09-cumulative-alpha-release.md)。

## 已明确搁置（不得自动恢复）

| ID | 事项 | 恢复条件 | 入口 |
| --- | --- | --- | --- |
| GG-900 | C6 自动账户删除/身份删除/举报与内容处理 | 站长明确要求并重审生产差异 | [保全与恢复](tasks/GG-900-deferred-c6.md) |
| GG-901 | 完整 seed、外部删除条款、复杂监控/响应 | 扩大服务范围或风险需要，另行确认 | [ADR 0024](decisions/0024-controlled-alpha-before-full-seed-readiness.md) |
| GG-902 | 收款/国内支付宝等商业化 | 站长重新确认且合规条件就绪 | [ADR 0010](decisions/0010-domestic-alipay-after-icp-with-manual-credit-operations.md) |

不为未经提出的功能预先排期；发现缺陷可登记，不能伪称已获产品批准。
