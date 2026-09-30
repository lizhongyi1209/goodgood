# GG-225 资产搜索组件与焦点样式

- 日期：2026-09-30
- 状态：子agent完成，局部验证/构建通过，已精确合入本地5173；完整门禁有原画布类型缺口，未部署。
- 分支 / worktree：`fix/GG-225-asset-search` / `F:/goodgood-worktrees/GG-225-asset-search`
- 基线：f2d7cbd；verified05e90d2祖先已核验，资产两文件与修改前GG-116一致；验证前fast-forward导航提交16496d4，共同验证GG224/225。
- 决策：不改变确认的产品决策；复用现有shadcn InputGroup，不安装新依赖。

## 范围与验收

资产页右上搜索使用InputGroup、InputGroupAddon、InputGroupInput。鼠标点击和键盘输入均无输入内部描边/焦点环，外层保持可辨识焦点状态。保留搜索值、当前文件夹提示/aria-label、文件与文件夹搜索及清空选择、约240×35胶囊和响应式排列。仅改资产组件与局部CSS，不改通用组件、画布GG222或服务。

## 实现与证据

原普通Input与label自组搜索框，被workspace input:focus-visible的outline覆盖。现改用InputGroup组合，普通Input保留给文件夹弹框；局部.workspace .searchInput及:focus/:focus-visible限定border/outline/box-shadow为0，优先级高于原规则；外层保留灰色focus-within描边，其他控件焦点不受影响。

导航11项、资产过滤/状态2项、文档8项共21/21通过；build:local与diff check通过。稳定后check:local仅运行一次，lint0错误/116既有警告，停止于原canvas-project-local.ts:21,35两处IDB类型错误，尚未进入完整测试阶段。该模块与修改前GG223基线相同且未编辑；未做浏览器视觉验收。

日志：`%TEMP%/goodgood-gg225-check-local.log`、`goodgood-gg225-build-local.log`（UTF16LE）。根精确git apply两源文件到GG116，与隔离树全文等价；只合入相对16496d4差异，不复制基线。回放后5173主页、资产组件和局部CSS均HTTP200且交付LibraryBig/InputGroup/焦点规则；32131 health/version仍verified05e90d2，服务未切换。

当前共享文档原已有长度超限（plan281/backlog188/state243行），本任务仅添加自身状态，未重整其他画布会话文档。

## 恢复工作与下一步

下一步站长刷新5173资产页，手验鼠标点击与Tab聚焦无内框、外层焦点可见、输入/清空搜索与文件夹内搜索正常；导航GG224的探索消失、资料库图标/提醒正常。原画布类型缺口另行处理，不占用GG222范围。未运行真实provider、上传、数据库写、服务重启或生产操作。
