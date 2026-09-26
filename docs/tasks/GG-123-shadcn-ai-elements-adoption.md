# GG-123 — 公共 UI 组件整合

- 状态：前三阶段本地实现与门禁完成；按站长后续要求，AI Elements CLI 已安装且第四阶段门禁通过；待站长浏览器验收，未部署。
- 基线：`F:/goodgood-worktrees/GG-116` 的 `311303c`；沿用站长指定的工作树和分支，不切换到 `main`。
- 请求：逐步覆盖整个应用，优先使用现成的 shadcn/ui 与 AI Elements 组件，减少页面重复 UI，保留全部当前功能和视觉决策。
- 决策影响：仅收敛实现和组件安装流程，不改变创作工作台、资产页或 Hero 的已确认产品行为；无需 ADR。

## 组件边界

- `components/ui` 已有 shadcn 原语，`components.json` 指向该目录；Tailwind 4、TypeScript、React 19 已具备。本阶段不重新初始化或重复安装。
- AI Elements 官方 CLI 已固定为项目开发依赖 `ai-elements@1.9.0`；组件按需放入 `components/ai-elements`。其 `PromptInput` 管理聊天提交和附件状态，`Image` 接受 AI SDK 生成图片对象；GoodGood 使用独立参考素材、批量生成与私有资产 URL。未找到保持现有行为的直接替换点前，不引入 AI SDK 或其 provider/网关配置。
- 两个真实调用方共享同一行为时才抽取应用组件。创作输入为图片和视频共用；资产页继续保留媒体预览、上传/删除/移动业务逻辑。

## 第一阶段验收

- 图片和视频创作器复用基于 shadcn `Textarea` 的输入控件，保持受控文本、八行上限、溢出滚动与窗口尺寸响应。
- 资产网格/列表的选择器改用 shadcn `Checkbox`，包含全选的混合态，保持 hover 才显示、已选持续可见、按钮区域和操作栏行为。
- 资产搜索、文件夹名称字段、标签、取消/提交按钮与文件夹弹框使用已有 shadcn `Input`、`Label`、`Button`、`DialogContent`，保持现有页内弹框的尺寸与操作。
- 不重置本地状态、不触发真实生成或上传、不修改后端契约；站长自行浏览器验收。

## 第二阶段验收

- 图片与视频创作参数的单选项共用基于 shadcn `ToggleGroup` 的受控控件；保留当前选中项、禁用项、提示文案和灰阶样式。不能通过再次点击已选项清空必填参数；支持键盘方向键。
- 资产底部选择栏的下载、移动、删除和取消按钮改用现有 shadcn `Button`；继续使用原有业务处理、权限与灰阶/红色删除样式。
- 定向测试 40/40；未做真实生成、上传、移动或删除。

## 第三阶段验收

- 个人资料编辑复用 shadcn `Button`、`Input`、`Label`，保留头像原生隐藏文件选择器、保存冲突恢复、禁用状态和原有抽屉布局。
- 创作工作台的项目保存抽屉复用 `Input` 与 `Button`；模型管理和视频线路开关复用 `Checkbox`，继续保留原启用条件与回调。
- 运营看板趋势范围及总日志筛选复用 `Select`；空筛选在 UI 中映射为“全部”，发送请求时仍使用原空值。日期和搜索字段继续使用已有 `Input`。
- 全应用可见的标准 `input`、`textarea`、`select` 已收敛到公共原语；剩余原生 `input` 为隐藏文件选择器。素材卡片、图表、编辑器按钮承担专门交互，保留其业务组件。
- 账户、组织、反馈等其余表单原本已使用 shadcn；没有为替换而改动其权限、错误、加载或空态。定向测试 26 项 / 25 通过 / 1 跳过 / 0 失败；未做真实保存或上传。

## 后续

1. 站长在 5173 手动复核前三阶段的视觉和键盘操作，尤其是创作参数、资产选择、个人资料、项目保存和运营筛选。
2. 新功能需要 AI 专用界面时，先确认 [官方组件](https://elements.ai-sdk.dev/docs/setup)的数据和交互契约，再运行 `npm run ui:ai:add -- <component-name>`，审查生成源码与依赖并完成该功能的验证。不要无参运行官方 CLI；它会安装全部组件。需要真实聊天消息流时再接相应 AI SDK，不为组件而改现有生成 API。

## 第四阶段：AI Elements 安装入口

- 使用官方注册表的 CLI，并在 `package.json`、`package-lock.json` 中固定项目级开发依赖；`scripts/add-ai-element.mjs` 要求至少一个合法组件名，阻止官方 CLI 无参安装全部组件。
- 本阶段只安装工具入口，不添加未使用的 UI 组件，也不增加 AI SDK、AI Gateway 凭据或运行时调用。后续每个真实功能按需添加组件和其依赖。
- 已确认项目具备 React 19、TypeScript、Tailwind 4 与 shadcn `components.json`，无需重新初始化。

## 验证与下一步

- `npm run typecheck` 通过；资产和导航定向测试 15/15。
- `npm run check:local` 通过：583 项 / 560 通过 / 23 跳过 / 0 失败；lint 0 错误、110 条既有警告。`git diff --check` 通过。
- 第二阶段：`npm run typecheck` 与创作/资产定向测试 40/40 通过；`npm run check:local` 通过：583 项 / 560 通过 / 23 跳过 / 0 失败，lint 0 错误、110 条既有警告；`git diff --check` 通过。
- 第三阶段：`npm run typecheck` 与个人资料/运营/模型定向测试 26 项 / 25 通过 / 1 跳过 / 0 失败；`npm run check:local` 通过：583 项 / 560 通过 / 23 跳过 / 0 失败，lint 0 错误、110 条既有警告；`git diff --check` 通过。
- 第四阶段：`npm ls ai-elements --depth=0` 确认 1.9.0 已安装；无参/非法名称安全入口定向测试 1/1，`npm ci --dry-run --ignore-scripts` 验证锁文件；`npm run check:local` 通过：584 项 / 561 通过 / 23 跳过 / 0 失败，lint 0 错误、110 条既有警告；`git diff --check` 通过。
- 未执行浏览器验收、真实 provider 请求、文件上传/删除或生产操作。现有 32131 检查点并非本次代码构建；5173 热更新仅供站长手动验收。
- 下一步：站长在 5173 复核前三阶段；后续 AI Elements 组件按真实匹配的功能再引入。
