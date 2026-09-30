# ADR 0113：画布模型图标改用本地静态 SVG

- 状态：已接受，本地实现待手动验收
- 日期：2026-09-29
- 关联任务：GG-169
- 调整：GG-142 在画布模型菜单从 `@lobehub/icons` React 包取图标的方式

## 背景

画布模型菜单只使用 Lobe 的 Nano Banana 和 OpenAI 两个单色图标，但从 `@lobehub/icons` 总入口导入。当前 5173 开发服务对画布请求返回的图标依赖脚本约 31 MB；资产页不加载它。站长希望将正在使用的图标改成本地静态文件，减少画布刷新负担。

## 决定

- 画布模型菜单保持原有单色图形、16px 尺寸、模型 ID 映射和装饰性语义；从 `public/model-icons/` 中读取本地 SVG。
- OpenAI 复用项目已有的 `openai.svg`，Nano Banana 使用已安装的 `@lobehub/icons-static-svg` 发行包中相同的单色 `nanobanana.svg`。继续保留生成参数、报价和列表交互。
- 不再从画布客户端代码导入 `@lobehub/icons` 总入口。现有包安装与其他页面的静态图标保持，依赖清理可单独处理。

## 影响

模型菜单不再因两个图标加载整个 React 图标包；本地静态 SVG 由浏览器独立缓存。React Flow 和其他画布依赖仍在，实际刷新时间由站长手动验收。
