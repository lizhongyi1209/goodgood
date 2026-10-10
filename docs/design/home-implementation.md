# GG-423 首页接入边界

- [任务卡](../tasks/GG-423-home-design-system.md) / [ADR 0144](../decisions/0144-design-system-v3.md)；先界面、后功能。
- 现有图片/视频导航进入 /create 并选模式；新首页复用已有 / 地址，其他页旧样式不改。
- 首页无参数；沿用原草稿/最近参数/默认值与上传、生成处理函数，不新增接口或更改计费。
- VITE_GG_HOME_DEMO 默认关闭且生产关闭；开发开启后常用模板和灵感采用独立本地数据，批量/对话只做本地展示，不作为已接通功能。
- GG-073 在 GG-117 退役，当前无真实灵感接口；公告 GG-340 仍实现，保留真实入口与账户权限。
- 新增 31 个 token、未改既有值，见 [逐项清单](home-token-changes.md)；真实检查结果与六截图见 [验证记录](home-verification.md)，完整门禁的存量失败不能写成通过。
- 共享展示组件在 features/design-system，首页与现有业务的适配在 features/home 和 app/page.tsx；旧 globals.css/Composer 样式仍服务 /create 和其他页面，不删除或全局覆盖。
