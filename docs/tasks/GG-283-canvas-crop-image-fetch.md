# GG-283 · 修复生成图片打开裁剪时Failed to fetch

- 日期：2026-10-02；状态：定位/修复中，未部署。
- 用户确认：生成器生成的图片，点击「裁剪」后出现Failed to fetch；本次明确委托检查此报错，允许与故障直接相关的只读诊断/定向回归，保持不运行局部编译、全量构建、lint或无关检查。
- 基线：实际GG-116的`649346d`，已核对祖先；根agent独占`fix/GG-283-canvas-crop-image-fetch` / `F:/goodgood-worktrees/GG-283-canvas-crop-image-fetch`，无子agent。
- 范围：修正生成图原图读取的受权URL/跨域字节链路与请求取消，保留上传图的同源content读取；给出可理解的读取失败提示。源码为crop-image/crop-editor、既有asset HTTP boundary、local-checkpoint启动器及相关定向回归；启动Worker也保留5173，避免覆盖共享本地桶的前端origin。
- 决策：修复ADR0126已接受的真实原图读取，不改变产品决定，无新ADR；不得以preview替代原图或关闭CORS/鉴权。
- 诊断：5173代理与32131 Web readiness均200且五项ok；生成图content路由返回302到签名存储URL，裁剪原来直接fetch该路由。已只读确认隔离RustFS桶`goodgood-gg052-local`的CORS只有127.0.0.1/localhost:32131，缺少5173，GET预检403。Worker启动器原来不含5173，准备共享存储时会覆盖Web设置；签名读取需要先解析直链以避免跨源302的opaque Origin。
- 浏览器：尝试已安装computer-use浏览器连接器，Chrome inventory报codex app-server路径不存在，无法读取用户标签页；不伪造浏览器确认。
- 运行边界：不生成、不上传、不删除原图、不改生产或云存储政策。需要恢复本地存储CORS时只针对现有隔离RustFS桶，保留合法应用origin和GET/HEAD/PUT限制，不加入null或通配origin。
- 修复进度：生成图先调用现有受权download-url并用omit凭据直接读取原图；上传图保持同源。请求取消贯穿签名/读取，底层网络错误改中文可重试提示。Node原生type stripping执行7项HTTP边界回归均通过，无Vite/TSC/Web编译；既有隔离桶CORS已备份并仅补两个5173地址，GET预检从403变200且返回匹配Origin，null仍403。当前两个忽略启动器的对应origin条件已同步修复，避免下次本地重启回退。
- 运行恢复：CORS备份`%TEMP%/goodgood-local-services/gg283-cors-before.json`；只修改隔离RustFS桶的AllowedOrigins，GET/HEAD/PUT/头部/缓存限制保持。两个忽略`dist/local-checkpoint-portfix.mjs`位于GG-116和GG-226，仅origin条件补worker；无需重启Web/Worker或编译。
- 下一步：精确集成并退役隔离目录；用户刷新后重新打开裁剪确认。
- 生命周期：创建1，交付后原生Git remove/prune退役；不安装依赖、不生成构建缓存、不重启Web/Worker。
