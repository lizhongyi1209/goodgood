# GG-035 — Seedance 线路与 O1Key 接口契约

- 状态：线路 UI 与 provider 契约已实现并完成本地验证；无有效临时凭据的真实成功调用待补，未接定价、未发布
- 用户需求：视频参数新增 `线路`，标准映射 Doubao、备用映射 HC，默认标准；保持当前全部参数和
  Seedance 2.5 官方能力不变，先确保 O1Key 请求端点与传参方式正确。
- 最后更新：2026-09-12
- 分支 / worktree：`feature/GG-035-seedance-provider` / `F:/goodgood-worktrees/GG-035`
- 基线：GG-034 已验证提交 `6a09a88`；这是依赖前端候选的堆叠分支，不代表已合入 main。
- 决策：[ADR 0049](../decisions/0049-connect-seedance-provider-lines.md)

## 范围与验收

- 要做：新增默认标准的线路参数；标准服务端映射 `doubao`，备用映射 `hc`；覆盖四个 Seedance
  产品型号的 provider 模型映射；实现素材创建/查询与视频创建/查询的 O1Key 适配器。
- 要做：证明请求方法、端点、认证头、素材类型、`content` 顺序和 role，以及当前比例、分辨率、
  时长、声音参数原样进入兼容的 provider payload。
- 不做：不修改现有图片接口、参数、Worker、计费或资产；不猜视频价格；不因旧文档收紧
  Seedance 2.5 能力；本阶段不开放缺少持久任务和计费保护的产品提交入口。
- 验收点：两条线路、四个模型、文生视频、多模态、首帧、首尾帧和素材状态均有无真实凭据的
  契约测试；定向测试和完整本地门禁通过。
- 决策影响：ADR 0049；用户确认标准为 Doubao、备用为 HC，两线能力完全一致。
- 授权边界：本地实现与隔离验证；未授权发布或生产变更。真实 provider 请求仅在明确隔离且
  有可用临时凭据时执行，并单独记录。

## 实现与证据

- 相关文件/专题文档：`features/creation/video-generation-options.ts`、视频创作器、
  `server/video/`、`docs/ARCHITECTURE.md`、`docs/TESTING.md`。
- 已完成：增加 `standard / backup` 产品线路和 `标准 / 备用` 展示，默认标准；页面状态、未保存
  判定和新建创作重置均包含线路，切换线路不修改现有参数或素材。
- 已完成：新增服务端 O1Key Seedance adapter；标准固定映射 Doubao 四个模型，备用固定映射
  HC 四个模型。素材创建/查询使用 `/v1/seedance/assets`，视频创建/查询使用
  `/v1/video/generations`；Bearer 凭据只在服务端 client 中使用。
- 已完成：产品 `4K` 只在 provider 边界转换为 `4k`；提示词始终是 `content` 第一项，普通多模态、
  文生、首帧和首尾帧角色按现有前端状态转换；不发送未开放的 watermark/return-last-frame 字段。
- 验证：GG-034 + GG-035 定向测试 13/13 通过，TypeScript 和受影响文件 ESLint 通过；
  `npm run check:local` 通过，345 项测试中 331 通过、14 个 opt-in 跳过、0 失败，lint、构建、
  TypeScript 均通过。
- 验证：对 `https://cf-api.o1key.com` 的四个真实路径做无效 token 无计费探测，均返回 401；
  证明路径和认证边界在线，没有创建素材或视频任务。当前环境没有可用临时 API key，因此没有把
  401 探测冒充 provider 成功生成。
- 验证：在现有 Chrome 中打开单一 `http://127.0.0.1:32137/create` 页面；视频参数显示
  `线路 / 标准 / 备用`，默认标准。切到备用后其他可访问状态无变化，随后恢复标准；未使用 Playwright。
- 发布：未发布。

## 恢复工作

- 尚未完成：使用专用临时凭据完成一次最小真实视频成功调用。
- 阻塞/风险：当前环境没有可用临时 API key；视频定价和持久 GoodGood 视频任务边界后续决定，
  不阻塞现有 provider 契约验证。
- 下一步：如用户提供专用临时 key，在隔离条件下执行一次最小真实请求并轮询完成。
