# GG-373 · 资产右键菜单字体与间距

- 日期：2026-10-05；用户附截图并调用Impeccable，要求修复移动至列表字体和间隔。
- 基线：干净efe98b92983c5634b7ba229bc2d84efbb08f7aae，已核验59a6dec祖先；当前开发目录F:/goodgood-worktrees/GG-116，GG-371/372功能与GG-366运行身份保持。
- 设计：Operate窄范围修整，沿现有GoodGood白灰黑菜单；不改变confirmed功能决定，无新ADR。读取指定Impeccable SKILL、polish及craft-floor；沿GG-276以用户截图和既有源码定位，不运行技能引擎、构建/检查/测试/浏览器或应用接口。
- 范围：仅canvas-asset-panel.module.css的两级菜单字体/字重/行高/图标间距与目录列表宽度；不改文案、交互、文件夹保存、后台或运行。纯样式不新增测试。
- 隔离：单agent，codex/GG-373-asset-menu-spacing，C:/Users/Admin/.codex/worktrees/gg-373-asset-menu-spacing/goodgood；创建1，无子agent/依赖缓存。完成限定提交后精确集成并归档。
- 验收：刷新5173，移动至图标文字间距与下载/重命名一致；目录列表同字号字重、行高一致，短目录不固定拉伸260px，长名仍省略且可滚动/键盘/禁用当前位置保持。
- 状态：源码已精确接入F:/goodgood-worktrees/GG-116，0b5d1a8ac913eeafeca6a0b0400bcafd3a581d8c；未自动验证/未部署。
- 下一步：用户刷新5173手验菜单字体、图标间距、内容宽度及移动至原行为。

## 当前交付

GG-373资产右键菜单排版源码已精确接入0b5d1a8ac913eeafeca6a0b0400bcafd3a581d8c（隔离4330226a6f6918d6c8e1aae8ded1c2459057583a）。两级菜单统一12px常规字重/20px行高/36px行与8px图标文字间距，目录名显式继承；移动至目录列表按内容宽度、140–260px及视口上限夹取，移除固定260px留白，原滚动/长名省略/触控44px保持。仅改局部CSS、设计与手验记录，不改功能决定/文案/归档或API。已按用户指定Impeccable读取SKILL、polish及craft-floor，沿GG-276未运行引擎、构建/lint/typecheck/代码或diff检查/测试/浏览器验收或HTTP/SQL/Provider；纯样式无新测试。GG-372/371源码和GG-366运行receipt保持，无服务/后台/生产更新。创建1/退役1，managed辅助确认归档，无子agent/依赖缓存；未自动验收/未部署，用户刷新5173手验菜单。
