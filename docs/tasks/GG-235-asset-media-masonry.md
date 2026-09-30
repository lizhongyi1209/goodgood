# GG-235 画布资产媒体恢复与瀑布流

- 日期：2026-09-30
- 状态：本地运行故障已恢复，前端实现/源码审阅/精确回放完成，UI待手验，未部署
- 分支 / worktree：fix/GG-235-asset-media-masonry / F:/goodgood-worktrees/GG-235-asset-media-masonry
- 基线：8ebf988的GG234交接，verified70e10c6祖先核验；只捕获当前五项资产依赖为0310351，CSS和公共图片组件与活跃GG116等价。只回放本任务增量，不合入显式依赖快照。
- 决策：[ADR0108补记](../decisions/0108-standalone-canvas-image-generation.md)，变更GG233普通行布局；实施前已记录。

## 范围与证据

用户截图为画布左资产两列，ImageOff只能证明图片加载失败，不能确定HTTP原因。原AssetVisual failed粘滞于kind:id、无retry；视频metadata-only/no poster或首帧seek，未使用解码尺寸；rows普通Grid同行最高行高导致短素材下空隙。子agent只读诊断未请求真实数据；实际运行根因与恢复证据见下文。

改AssetPanel局部媒体渲染/失败恢复/受权内容fallback/首帧及行跨度瀑布流；保留GG234背景#eaeaec和brightness(.97)、所有真实权限/拖入/改名/添加与上传。先不改公共图片原语/任一后端/节点/同步。失败明确、不循环请求或生成；列表刷新仍须用户可控。

## 交接与下一步

子agent仅改 panel/CSS，实现提交 fac5245e89a1625d5d0792fc7aa5c02f5a38e636；根审阅媒体phase/React key、异步列表epoch与AbortSignal、原比例首帧、RO/MO与RAF先读后写、隐藏输入/完整提示及拖动/改名/添加边界。精确增量预检通过后回放到GG-116，交付后再次核对两源均与fac5245等价；未bulk merge依赖基线或其它窗口改动。源码/diff检查通过；沿用画布no-retest交付约束，未运行install/tests/check:local/typecheck/build/浏览器功能复测。运行修复证据是下文独立只读诊断与最小本地恢复，不算UI验收。下一步站长刷新资产面板，手验图片、视频真实首帧、单双列瀑布流/高度更新、失败重试和原拖入/改名；后端70e10c6/56迁移和唯一Worker6304保持。

## 已确证的运行故障与最小恢复

根只读现有Web日志确认：本地图片preview累计503（生成56/参考10）与socket hang up；云参考302正常。严格54449/58049只读S3 HEAD/GET/preview取样全部ECONNRESET；容器内部9000健康200，而主机58049 empty reply，Docker发布端口失效，非图片不存在的证据。56549只读连接同样失效，Valkey内部PING及两队列正常0；本地DB active jobs/outbox/冻结积分均0。

因此根将最小串行恢复两个现有goodgood-gg052本地容器的端口映射（object-storage与valkey），保留原volume与数据，不停止/替换Web/Worker、不跑迁移/seed/provider。此项为本次用户要求修复真实展示所需的本地依赖恢复，GG234禁止其UI任务服务变化不被当作全局发布授权；生产不在范围。子agent仍不得操作运行时。根已串行重启原 object-storage、valkey 两容器，沿用原 named volume；主机58049健康200。恢复后只读抽查3张生成图片、2张本地参考图片和1个视频：S3 HEAD200/分段GET206；五张图片真实预览转码均成功。严格本地状态检查迁移56、active jobs/outbox/冻结积分/两队列均0；Web32131/Worker32142 ready200，Vite5173代理版本70e10c6 verified=true。Web34208、唯一Worker6304、Vite34440未替换，数据库/素材未重置，也未提交任何生成。浏览器连接不可用，故这些证据仅确证存储/预览链路恢复，不声称UI手验通过。

## 已实现的局部行为

- 同卡缩略图与hover预览共享一次preview→受权content降级，最终失败显示单卡重试；源或成功列表轮次变化清除failed，同URL手动重试通过attempt重挂载。
- 视频读取真实元数据比例并短seek取得首帧，loadeddata/canplay/seeked满足readyState条件才显示；默认静止，大图保留既有静音播放/reduced-motion/可见性约束。视频重试只GET列表一次，关闭/读取轮次变化丢弃旧回包并更新拖入源地址。
- 1px dense行跨度和约8px间距，媒体加载、改名、上传中卡增删及容器单双列变化都重排；observer只收集、RAF先读后写且比较span，关闭取消。原比例、GG234颜色/亮度、folder/上传/键盘与拖入保留。
