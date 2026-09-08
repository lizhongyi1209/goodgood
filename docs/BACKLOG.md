# 当前任务与优先级

最后同步：2026-09-08。这里是索引，细节以任务卡为准；不是自动执行所有项目的授权。

## 当前与最近交付

| ID | 事项 | 状态 | 入口 |
| --- | --- | --- | --- |
| GG-001 | 项目记忆精简、交接协议、历史 C6 隔离 | 已完成（不需上线） | [任务](tasks/GG-001-project-continuity.md) |
| GG-002 | Nano Banana 2 全宽高比/分辨率 | 已上线 | [发布记录](releases/2026-09-07-banana-2-parameters.md) |
| GG-003 | 将 alpha 发布门禁从历史快照独立提取 | 待办；下次发布前 | [任务](tasks/GG-003-alpha-release-tooling.md) |
| GG-004 | 修复重复投递导致生成结果丢失 | 待验收；本地已验证，未发布 | [任务](tasks/GG-004-generation-dispatch-race.md) |
| GG-005 | 分辨率改为 1K/2K/4K，并展示资产实际像素 | 本地已验证；未发布 | [任务](tasks/GG-005-resolution-metadata.md) |
| GG-006 | 放大 1:1 参考图预览并将画面比例移到左侧 | 本地浏览器已验证；待站长验收 | [任务](tasks/GG-006-reference-tray-layout.md) |
| GG-007 | GPT IMAGE 2 SD 精确尺寸、真实生成与三档 10 积分 | 本地浏览器已验证；待站长实测 | [任务](tasks/GG-007-gpt-image-2-sd.md) |
| GG-008 | 生成按钮支持无限次快速并行提交 | 3010 已就绪；待站长真实生成验收 | [任务](tasks/GG-008-parallel-generation.md) |
| GG-009 | GPT IMAGE 2 开放 2 / 4 张输出，每张 10 积分 | 3010 已就绪；待站长真实生成验收 | [任务](tasks/GG-009-gpt-image-output-counts.md) |
| GG-010 | Nano Banana 2 开放 2 / 4 张编排输出，每张 10 积分 | 3010 已就绪；待站长真实生成验收 | [任务](tasks/GG-010-banana-multi-output.md) |

下一个普通产品需求从 **GG-011** 分配并检查是否已被占用。
GG-003 不阻塞本地新功能开发，但必须在下一次实际 alpha 发布前闭环。

## 已明确搁置（不得自动恢复）

| ID | 事项 | 恢复条件 | 入口 |
| --- | --- | --- | --- |
| GG-900 | C6 自动账户删除/身份删除/举报与内容处理，迁移 0013–0020 | 站长明确要求；重新审查快照与生产差异 | [保全与恢复](tasks/GG-900-deferred-c6.md) |
| GG-901 | 完整 seed 就绪、正式外部删除条款、复杂监控/响应体系 | 扩大服务范围或实际风险需要，另行确认 | [ADR 0024](decisions/0024-controlled-alpha-before-full-seed-readiness.md) |
| GG-902 | M9 收款/国内支付宝等商业化 | 站长重新确认；商户/域名/合规条件就绪 | [ADR 0010](decisions/0010-domestic-alipay-after-icp-with-manual-credit-operations.md) |

不为未经提出的功能预先扩展排期；发现代码缺陷或依赖缺口可登记，不能伪称已获产品批准。
