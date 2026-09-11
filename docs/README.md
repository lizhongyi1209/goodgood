# GoodGood 文档导航

仓库是跨窗口共享的项目记忆。先读短入口，再按需读细节，不要求加载全部历史。

## 新会话必读

1. 根 [AGENTS.md](../AGENTS.md)：稳定约束、入口、权限边界。
2. [CURRENT_STATE.md](CURRENT_STATE.md)：真实阶段、线上版本、未发布/搁置内容。
3. [WORKFLOW.md](WORKFLOW.md)：需求 → 本地实现 → 验收 → 精确候选发布 → 交接。
4. `IMPLEMENTATION_PLAN.md`：[唯一当前检查点](IMPLEMENTATION_PLAN.md)。
5. [BACKLOG.md](BACKLOG.md) 与 [任务卡](tasks/README.md)：优先级、验收、进度和下一步。

同时检查实际 Git 状态；不会自动读取另一个窗口的聊天，也不应依赖它。

## 按任务加载

| 文档 | 解决什么问题 |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | 产品范围、术语与人群 |
| [PRODUCT_JOURNEY.md](PRODUCT_JOURNEY.md) | 用户决定、被放弃的方向与原因 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 品牌、颜色、组件与布局 |
| [UX_FLOWS.md](UX_FLOWS.md) | 交互与状态合同 |
| [ROUTES.md](ROUTES.md) | 导航与 URL |
| [PROJECT_MAP.md](PROJECT_MAP.md) | 文件责任与模块边界 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 实际集成边界及演进 |
| [DATA_MODEL.md](DATA_MODEL.md) | 实体与生命周期 |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | 错误、恢复与观测 |
| [TESTING.md](TESTING.md) | 验证方式、测试覆盖与证据边界 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 环境、运行与发布/回退；历史转换不是待办 |
| [EMAIL_AUTH_PLAN.md](EMAIL_AUTH_PLAN.md) | GG-029 已选自建邮箱验证码的上线范围、实施阶段与迁移回退；尚未实现 |
| [decisions/README.md](decisions/README.md) | ADR 及已确认取舍；Accepted 不代表已上线 |
| [releases/](releases/) | 已发布版本的非敏感证据摘要 |
| [history/README.md](history/README.md) | 提炼经验及完整历史，默认不加载 |

## 有冲突时

- 遵守适用指令优先级；用户的新明确决定及时记 ADR/任务卡，不能因尚未落盘忽视它。
- 预期产品行为由已确认决定、AGENTS 和专题合同定义；改变旧决定先记录。
- 代码/Git/测试描述实际实现，精确发布证据描述实际生产；文档不能代替实测。
- 发现合同与实现不一致，标出差异、风险和修复方向，不能悄悄改合同粉饰。
- 截图、旧聊天和历史计划用于追溯，不能覆盖新的明确决定或当作操作授权。

每次任务交接同步任务卡与当前计划；部署事实变化才更新 CURRENT_STATE。
同一事实指定一个主位置，其他文件链接过去，避免多个互相竞争的“当前状态”。
