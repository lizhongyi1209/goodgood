# 当前前端设计系统重构交接

日期：2026-10-06。此分支是用户当前本地前端的完整项目快照，用于其他 AI 重构设计系统；保留必要的项目结构和后端源码以满足现有导入关系，不将页面单独拆成无法启动的散件。它不是生产发布。

- GitHub仓库：https://github.com/lizhongyi1209/goodgood
- 设计快照分支：design/gg-402-frontend-snapshot
- 当前应用源码：e401e8658bb899a13418899f891973ec136ad5c8（GG-401）；包含截至本次交接的大厅、账户、资产、画布、文本/图片/视频节点和分镜编辑。
- 请求范围：设计系统、样式和前端交互呈现的重构；功能开发由原会话继续。请从此快照建立自己的设计分支，提交可单独评审的改动，避免直接修改功能会话的分支。
- 验证状态：最近迭代按用户要求只修改源码，未自动构建、lint、typecheck、测试或浏览器验收；不能把已提交等同已验证。

## 从这里开始

先读 AGENTS.md 与 docs/DESIGN_SYSTEM.md、docs/PRODUCT.md、docs/UX_FLOWS.md。当前功能状态以 docs/IMPLEMENTATION_PLAN.md 和 docs/DEVELOPMENT_HANDOFF.md 为准；历史任务的提案、生产概览和main分支不是当前前端的替代基线。

| 位置 | 用途 |
| --- | --- |
| app/globals.css | 全局色板、tokens、基础样式 |
| components/ui/、components.json | Radix/Shadcn公共原语及配置 |
| app/page.tsx、features/navigation/ | 大厅与页面导航 |
| features/assets/、features/projects/、features/profile/、features/auth/ | 资产、项目、账户相关页面；目录边界以实际源文件为准 |
| features/canvas/canvas-page.tsx、canvas-workspace.tsx及CSS模块 | 画布页面、React Flow、工具栏和节点 |
| features/canvas/canvas-*-generator-*、canvas-*-storyboard-* | 图片、文本、视频chat与分镜呈现 |
| features/canvas/canvas-text-* | 文本编辑器及格式快捷操作 |
| public/ | 品牌标识与模型图标 |
| features/**/http-*.ts、shared/contracts/ | 既有前后端边界和领域值，样式重构应保持协议 |

## 协作边界

GoodGood是简体中文、以图片为中心的创作工具。保持当前黑白色板、黑色图标、灰色状态填充和近黑主操作；品牌使用既有GoodGood资源。允许整理公共样式和组件，保留上传/生成/流式状态、批量失败插槽和重试、编辑确认/取消、预览、计价、保存恢复、键盘/焦点/缩放与移动等已实现行为。React Flow节点中的相关hooks须保留provider祖先；Radix组件保留provider、焦点和无障碍语义。参数展示遵循已连接素材和真实接口规则，不因视觉重构改变模型ID或请求字段。

app/api/、server/、数据库迁移、shared/contracts/领域协议、价格和任务计费不是本次设计重构的修改目标。若设计确需协议改动，单独说明，由功能会话协作接入，不以复制假逻辑替代现有功能。前端CSS模块和大型canvas-page可能被功能会话继续修改；优先提交独立tokens/公共样式/局部呈现组件，避免整页无关重写。

## 在其他电脑预览

Node.js >=22.13.0，安装锁定依赖并启动：

```bash
npm ci
npm run dev:local
```

使用Vite实际打印的URL。仓库不含本机登录状态、真实用户数据、外部开发密钥、数据库、已生成私有素材和构建缓存。UI可以在无秘密环境下开发，登录后的持久化/真实生成需要独立本地依赖与开发凭据，按docs/DEVELOPMENT_HANDOFF.md配置；不使用生产凭据，不自动提交付费生成。这里提供启动说明，没有在本次任务运行这些命令。

完成后提供设计分支、提交版本和改动文件范围；功能会话按范围接入，继续保留当前真实能力。
