# GG-294 · 文本生成入口排序与本地构建启用

- 日期：2026-10-02。
- 请求：文本生成紧接文本编辑；构建以便用户测试文本生成。
- 范围：菜单顺序改为文本编辑 / 文本生成 / 图片生成；构建当前集成源码、应用本地新增0061、替换32131 Web；保留5173 Vite及32142图片Worker、现有用户/资产/积分与云参考图配置。
- 决策：沿用ADR0127及每次20积分；菜单微调不改变既有产品决策。
- 基线：实际源码目录 F:/goodgood-worktrees/GG-116，a15f636；含GG-291和GG-293撤回，禁止恢复GG-292/0062。
- 所有权：根agent；独立分支 fix/GG-294-text-generation-test、目录 F:/goodgood-worktrees/GG-294-text-generation-test；仅菜单和本任务文档。无子agent。
- 状态：菜单79db1ed精确接入为767e6db；当前集成源码已构建，本地0061及新版Web已启用，用户手验，未部署。
- 验证范围：本次用户明确委托构建；不运行lint、类型检查、测试、全量门禁、浏览器验收或真实生成。仅核对启动身份、迁移目标和本地服务响应。
- 构建：npm run build:checkpoint成功；revision 767e6db1af53912476c022f81f0d45c77845c402，2026-10-02T06:07:56.308Z，sourceHash be70848fde000b1a1ffbfd8d500c16e364837a98836319c40ad6d065e036b65b，artifactHash 7936b09187802f6d9c1d83ba5d468603b84460d729035590509c1fbc9f4dca6e，288个产物。未运行其他代码检查或测试。
- 迁移：仅127.0.0.1:54449/goodgood；执行前唯一待应用为0061_gg291_text_generation.sql，图片任务仅9成功/1取消、待分发outbox为0。直接调用applyMigrations，不运行本地fixtures；仅新增0061，现有记录保持。
- 运行：仅替换已核对身份的Web4552→33072，启动保留cloud-development及local-mailpit；32131和5173/api/health/version均返回上述revision及build.verified=true。唯一图片Worker31280/32142及Vite27464/5173保持。匿名GET文本任务接口返回401 SESSION_EXPIRED，确认路由已接入；未提交任何生成或provider请求。
- 启动器：构建前备份既有两个忽略适配器，构建后原样恢复；临时代码备份已删除，外部凭据没有复制或输出。
- 下一步：用户刷新http://127.0.0.1:5173/canvas手动测试文本生成与20积分计费；真实提供商输出及视觉效果尚未验收。文档后继不改变已运行构建身份，后续重启仍先构建当前HEAD，不伪造receipt。
- 生命周期：创建1/退役1；核对指定根内的任务目录、干净Git/忽略项且无使用进程后通过Git remove/prune退役，保留分支/提交；无依赖安装或子目录缓存。
