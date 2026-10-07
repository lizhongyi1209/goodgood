# GG-415 · 生成进度响应解析检查

- 日期：2026-10-07；状态：源码链路分析完成，未修改应用或重启服务。
- 用户请求：生成中一直显示0%，确认是否读取/解析响应体进度。未要求发起新生成或改动进度策略。
- 基线：GG-116干净b043b63，包含556ec9e；分支chore/gg-415-generation-progress-audit。应用源码仍GG-413，实际运行仍GG-414/1dc37ee；根agent，创建0/退役0，无子agent。
- 决策：诊断不改变产品决定，不新增ADR。已询问图片或视频节点，未把未确认节点当作事实。

## 源码结论

- 图片：us-gateway-adapter.mjs读取顶层payload.progress，支持整数或整数字符串百分比，并去重/处理状态顺序；provider-router.mjs的pollTask onUpdate只触发onRefining，不转交update.progress。worker-service/repository仅写20/75/100阶段数值，publicGenerationJob与GenerationJob契约不含progress，当前图片节点是加载动效而非真实百分比。解析存在，进度到前端链路不完整。
- 图片解析另有问题：Number(null)/Number('')/Number(false)均为0，当前normalizeProgress没有先排除这些值，可能把无有效进度当作零；缺失undefined则运行态返回null。不在本次只读任务中修复。
- 视频：provider.mjs读取响应JSON后仅接受顶层payload.progress的number 0..100；字符串百分比/数值字符串、嵌套data.progress等不读取。worker将task.progress落库，api把job.progress返回前端，节点传给CanvasVideoGenerationProgress；获取/传递链路存在。
- 视频0%机制：advanceCanvasVideoGenerationProgress把0认作有效reported并保存；feedback在reported !== null时不启动估算时钟。后续缺失仍保留以前的reported，故上游先给0、随后缺失或无法解析时会一直0。这是源码可证的条件，不代表已读取用户原始回包或能确认上游实际发送了哪个字段。
- 当前最近一次O3视频已于2026-10-07T03:00:04.186Z成功，最终持久progress为null；该证据只能说明归一化/持久层没有数值，不能区分上游缺值与字段格式未解析，也不能还原每次中间进度。近3条图片均为旧Pro任务，没有新的2.1任务。

## 验证边界与交接

- 仅源码阅读及BEGIN READ ONLY读取具名127.0.0.1:54449/goodgood最近任务的model/state/progress/时间，无prompt、素材URL、用户信息或凭据输出。外部聚合证据TEMP/goodgood-local-services/gg415-progress-audit.json。
- 未构建/编译/lint/typecheck/测试/代码或diff检查、浏览器/HTTP/Provider请求、生成/扣费、SQL写入/迁移/服务/生产或GitHub操作；未修复或宣称上游不支持进度。
- 下一步：根据用户确认的节点范围决定修复；视频需按实际回包补字段解析并处理零值等待展示，图片若需要真实进度则补Worker持久化/API契约/前端展示，保留未知进度与真实0的区别，不把估算包装为真实进度。

- 后继GG-416：用户提供顶层progress:0视频示例并要求按最新查询数值展示、零值继续估算；前端对应源码已修改。此处原零值停止/最大值结论为历史，图片传递及视频字符串/嵌套解析未在GG-416改动。
