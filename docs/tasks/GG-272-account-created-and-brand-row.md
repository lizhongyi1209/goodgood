# GG-272 · 账户创建时间与字标标题对齐

- 日期：2026-10-01；状态：已整合5173/Web并代码验证，未部署；用户负责浏览器验收。
- 基线：GG-116 `6238846`，含GG-271 `599944e`及GG-268已整合源码/测试；隔离 `fix/GG-272-account-created-and-brand-row` / `F:/goodgood-worktrees/GG-272-account-brand`。保护GG-268/GG-270并行功能。
- 范围/验收：账户管理/个人信息新增只读「创建时间」，来自users.created_at，以北京时间显示日期与分钟；缺失/非法时间显示暂不可用，既有读取状态与编辑规则保持。桌面字标下移至与右侧项目标题中心同一水平线，收紧导航间隔，保留GG-271的左侧对齐、108px字形与移动头部。
- 决策：更新ADR0075的只读账户信息范围；不改变品牌身份、计费或注册逻辑。
- 所有权：根修改server/profile/api.mjs、features/profile两组件与相关测试、app/globals.css共享标题位置变量与品牌布局，以及相关文档/本卡；共享交接在集成时逐段同步，不改并行画布文件或依赖。
- 交付：子`d55e8da`源码/测试/ADR精确整合为根`c4b10b8`，共享文档独立同步，保留GG-268/GG-270。API只读投影`u.created_at AS account_created_at`，避免资料时间覆盖；保存输入不接受createdAt，无SQL迁移。
- 验证：资料API/SSR/编辑与新增时间测试22/22（含未配置、加载、失败、午夜北京时间、伪造只读字段拒绝与保存时间稳定）；相关lint零错误/警告、三个Vite模块HTTP200及diff通过。一次必要checkpoint构建通过，Web/5173健康身份均为`c4b10b8814d39bfa3c6b5160e2a90fe0c142aba8`、verified=true/readiness200，原cloud-development/0060/唯一Worker保持；无真实生成/上传、数据库写测试或浏览器验收。
- 构建证据：sourceHash `8add67e7b2cc34b9ee72c7805c641394d6540b54a6a44fa8afca9281412d83c2`，artifactHash `1c6977f783fcf5870c66cd7db4187dc134387b4eaf930afe43490fcdf28187e1`，283文件，builtAt `2026-10-01T13:32:42.814Z`；文档后继HEAD不改变实际运行身份。
- 生命周期：创建1/退役1；已核对clean/ignored、8个源码/测试/ADR文件与集成提交一致、无占用进程和绝对路径，并Git remove/prune。无子agent、依赖安装或子构建缓存残留。
- 文档收口：连续性9/9、暂存与工作区diff检查通过；BACKLOG保持100行。GG-271交付/退役状态及当前源码/Web身份同步，保留GG-268/270独立证据。
- 下一步：用户刷新5173验收；无代码/运行阻塞，文档后继不改变上述实际Web身份。
