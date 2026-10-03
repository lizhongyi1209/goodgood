# GG-322 · 重试后的图片插槽保存提示修复

- 日期：2026-10-03；用户明确交给子agent：刚才点击重试后出现「服务器暂不支持图片插槽；当前画布已保存在本机，更新后台后可继续同步。」修复。
- 基线/所有权：GG-116当前7e52a2f、插槽源码4489d1d；子`/root/image_result_slots`在隔离`fix/GG-322-image-slot-sync-compatibility`、`F:/goodgood-worktrees/GG-322-image-slot-sync-compatibility`负责定位和必要应用修复，根只维护文档/集成与受权激活。
- 初始事实：GG-319已运行Web/唯一Worker419b097，早于GG-321新imageSlots云校验。截图是保存兼容提示，需要区分旧Web缺字段与真实生成失败；不能假报已同步或丢弃固定插槽/冻结输入/成功图。
- 决策：不改变ADR0134的插槽/单张重试、授权和计费；不新增SQL或绕过云资源校验。源代码修复与运行激活分开。
- 范围：最小定位当前保存/重试链路与兼容提示；源代码有缺陷才修复。根已提出是否允许本次仅必要构建+重启Web的问题，因为用户此前明确默认只改代码。收到许可前不得激活，Worker/原数据/SMTP保持。
- 验证边界：无测试/lint/类型检查/代码或diff检查/浏览器/SQL/provider操作；必要回归只写不运行。若用户允许，必要构建和Web版本/readiness可用性核验不扩展成测试。
- 状态：子应用9920bde精确接入0ce2360，一处同步错误文案修正完成；用户授权的必要构建及仅Web激活完成，GG-321插槽云校验已生效。构建/启动身份与readiness确认，未运行功能测试，由用户刷新手验；未部署。
- 生命周期：创建1/退役1，子已结束；辅助目录无依赖/缓存，正常Git移除，保留分支和提交。

## 定位与实现

- 当前运行Web419b097早于GG-321的imageSlots校验，保存新插槽被旧接口拒绝；截图由画布同步器触发，并非生成接口返回。runGeneratorJobs等待本机快照flush，不等待远端同步，因此此提示本身不能证明单张重试请求失败。
- 真正源码缺陷：同步器将所有带slots的INVALID_CANVAS_PROJECT错误推断为旧服务不支持。现显示服务器实际平台错误，并明确本机已保存、尚未云同步；offline/dirty/retryBlocked保持，不剥离插槽、不伪报成功。
- 现有GG-321服务器插槽校验已完整，恢复云同步只需启用此Web源码；不改Provider/Worker、SQL、计费、槽状态或请求输入。未增加仅镜像文案的回归来源，不运行既有回归。
- 激活授权来自本轮用户答复，仅必要构建和重启Web；Vite/唯一Worker、数据与本地邮件配置保持。

## 激活与交接

- npm run build:checkpoint一次成功；revision0b5744d8f4c1aa517b95ff2d1e5557e706fd23f6、sourceHash c1f77fb879923d02af25f80923314dc8a91028d3f391a446fd30b52b2a9e8d47、artifactHash b01aa15b7ca0c27b2c525814920572d1ed7f0a9956bcbecd7ff091d6de674887、294产物、builtAt2026-10-03T03:46:31.688Z。未运行测试/lint/类型或diff检查。
- 原Web28248/32131重新识别后仅替换为25664/32131；32131与5173代理version均verified0b5744d，Web readiness五项runtime/database/objectStorage/provider/queue均ok。唯一Worker28236/32142仍是419b097，Vite33312/5173保持；不需要更新Worker、SQL迁移或重置数据。
- 保留两份忽略启动适配器，构建后原样恢复；referenceStorage=cloud-development、emailDelivery=local-mailpit。日志沿用%TEMP%/goodgood-local-services/current-web.{out,err}.log，无凭据入diff；无真实生成/上传、SQL或生产操作。
- 下一步：用户刷新已有画布并重试失败位置，确认固定槽/成功图及云同步。此轮没有提交真实重试或读取用户任务结果，因此不宣称其具体生成已成功；后继文档提交不改变上述运行receipt，下次启动仍须构建当前HEAD。
