# GG-233 画布资产卡片与添加入口

- 日期：2026-09-30
- 状态：隔离实现完成，已精确回放 GG-116 / 5173 源码；仅静态审阅，待站长手验，未部署。
- 工作树：`F:/goodgood-worktrees/GG-233` / `feature/GG-233-canvas-asset-cards`
- 基线：已核验当前后端 `70e10c6ae6bd83542ba870f54059b54b999e9fdf`；显式当前 GG-116 面板/上传依赖及 ADR/设计/UX 快照提交 `4ac3631`。只回放本任务相对此快照的增量，不合入快照或其它窗口的改动。
- 实施提交：`32764ce000cbfca978d63a8b25012ff0b1258365`，十文件相对基线增量已精确应用活跃树，原有其它窗口改动保留。
- 设计方法：Impeccable Operate，layout/adapt/craft-floor 文档参考；用户禁止复测，因此不运行 engine/检测/浏览器。
- 决策影响：GG-151/GG-155/GG-162 的小图文件名行已被新卡片和明确上传动作取代；实施前已补 ADR0108 GG-233 addendum。

## 范围与验收

首位浅灰圆角加号卡；仅「上传文件」「链接」菜单，图片直链粘贴后箭头或 Enter 提交。文件夹 1:1 圆角且可辨名称；图片不显示文件名、保持完整原比例。按面板自身宽度一列/两列，卡间距紧凑。原有预览、拖入画布及双击/F2 改名可用；视频/音频保留区分和可访问名称。

实现使用 240px 面板容器阈值，默认 248px 已为两列、8px 间隔；图片区用 `width:100%; height:auto` 与有值的真实尺寸预占位。添加入口在加载、读取失败和空库仍可见。菜单/链接子层用现有 Radix Portal，链接输入以受控子菜单加 RAF 聚焦；提交图标为向上箭头。图片键盘除 F2 外也支持 Enter/空格开始改名，保存/取消规则不变。

文件选择仅在用户动作后调用现有 JPEG/PNG/MP4/MP3 私有上传，各 20 MiB 上限。公共 HTTP(S) JPEG/PNG 直链只在浏览器 CORS 读取，omit credentials/no referrer/超时/逐字节大小上限，然后走同一图片上传；无新服务器代理。只接纳 ready，提交时捕获目标文件夹，真实列表刷新；不自动创建画布节点。失败文件单独重试，归档失败保留 ready ID 并只重试归档，链接失败保留输入。关闭侧栏中止链接下载，已开始上传继续入库，避免误取消留下 pending。

完成或已 ready 的归档失败只派发一个内部列表刷新事件，活跃面板注册/清理单 listener，因此旧实例上传完成后重开的面板也可刷新；旧实例状态更新有 mounted guard。Blob URL 在真实列表确认 ready、失败提示移除或面板卸载时释放。pending 上传卡不能拖动，失败保持 File 与具体错误可单项重试；归档重试复用已 ready ID，链接相同输入复用失败行而不重复下载/上传已确认素材。

## 验证边界

按用户持续要求，仅静态源码和差异审阅；不得执行测试/check:local/typecheck/build/浏览器/CUA/API/provider/上传/服务/数据库或部署操作。可新增测试定义但不执行。静态检查不等于行为或视觉验收。

已新增 `tests/gg233-canvas-asset-addition.test.mjs` 十条未执行定义：四类格式/大小边界、URL 协议/凭据、无凭据/无 referrer、MIME/扩展名、HTTP/空/伪装图片、声明与流实际大小、CORS错误、超时/重试和取消。本任务未调用任何真实接口，后端仍为 GG-226 verified70e10c6 / 56 迁移。

实际静态证据：隔离 staged diff/source diff `git diff --check` 通过；十文件增量 `git apply --check` 通过后应用 GG-116；五源文件、测试定义和任务卡归一化换行全文一致，目标 diff 检查通过。根静态审阅确认现有 Radix 公开 props、单完成事件清理、ready/归档分离和受限下载边界。本记录不表示测试、类型检查、构建、请求或浏览器视觉验收通过。

本任务源文件：`canvas-asset-panel.tsx` / `canvas-asset-panel.module.css`、新增 `canvas-asset-add-card.tsx` / `canvas-asset-addition.mjs` / `canvas-asset-upload.ts`；另有测试定义、ADR0108 addendum、DESIGN_SYSTEM/UX_FLOWS 的 GG-233 单段和本任务卡。无依赖、服务器协议、schema、真实素材或生产差异。公共图片须允许浏览器跨域读取；失败输入/单项恢复为当前面板状态，不新增跨刷新失败文件存储。

## 当前下一步

站长在现有 5173 手验两列/窄列、原比例/无图片名、文件夹进入、两项菜单/输入箭头、真实上传与直链成功/失败/归档重试、关闭重开后列表、拖入画布和改名。根汇总 BACKLOG/IMPLEMENTATION_PLAN/DEVELOPMENT_HANDOFF/CURRENT_STATE/TESTING；后端继续 verified70e10c6 / 56 迁移，不恢复历史运行树。
