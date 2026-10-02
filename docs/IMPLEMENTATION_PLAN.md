# Production implementation plan

- Last synchronized: 2026-10-02
- Current phase: GG-306画布默认512/放大按需最高2048预览源码f004e5f已精确接入GG-116/5173，创建1/退役1，未编译/验证；远程高清接口待更新Web，旧后端保留512。并行GG-307 ebd8ace/07a571c、GG-305参数筛选及GG-303/304源码、GG-300运行/本地0062/唯一Worker保持，未部署。
- Current objective: 用户手验默认压缩预览、本地图片及前序功能；远程2K与GG-303批量云端保存需后续明确委托构建/更新Web（本任务无SQL）。不自动编译/验证、浏览器或真实请求，默认仍仅代码开发。
- Previous objective: GG-305参数筛选源码5a4fb15已接入，09dbe13记录未验证交付；GG-304/GG-303、GG-302排查及GG-300运行保持。

## Current checkpoint

- 当前显示源码 [GG-306](tasks/GG-306-canvas-adaptive-preview.md)：基于5a4fb15，隔离3e75204精确接入f004e5f，保留并行GG-307 ebd8ace；ADR0132将画布显示分512及最高2048两档，资产拖入不取下载地址，上传/结果共用显示组件，视野/屏幕需求及180ms迟滞控制高清，保留小图层、共享3并发/8闲置URL身份缓存。新canvas-preview复用私有鉴权并返回等比最高2048 WebP，原图/列表/附件/裁剪及模型输入保持。实际尺寸独立于预览，保存重开沿原ID。创建1/退役1，无编译/检查或运行/迁移变化，回归来源只写未执行；新高清接口待更新Web，旧Web保留512，用户手验。

- 当前修正 [GG-307](tasks/GG-307-hide-banana-thinking-details.md)：基于09dbe13，登记e3fdb6d后隔离0e6d4f2精确接入ebd8ace；移除详情中的思考条目，包括Nano Banana 2 high记录。先补ADR0123覆盖GG-305的高思考显示规则，仅改展示/既有回归断言，生成请求/快照和其他参数保持。创建1/退役1，未编译/验证或运行变化，用户刷新手验；GG-306独立工作区保持。

- 当前修复 [GG-305](tasks/GG-305-canvas-viewer-used-parameters.md)：基于1387b4c，登记ea78337后隔离167e864精确接入5a4fb15；详情参数按图片对应job.input、模型能力与provider发送条件筛选，Banana/Seedream无GPT专属项，空参考图/未开启搜索及低思考占位隐藏，GPT有效记录值和具体型号质量范围保留。仅元数据组装/回归来源与ADR0123细则，无生成/存储/后端/布局变化；用户确认预设暂不处理。创建1/退役1，未编译/验证或运行变化，用户刷新手验。

- 当前样式 [GG-304](tasks/GG-304-canvas-connection-drag-flow.md)：基于31be3bd，登记a91b200后隔离30790ea精确接入0ad78b0；临时connection-path复用hover亮蓝/7 4/1.3s流动、reduce亮色静止实线，原贝塞尔/线宽/完成线/连接校验及剪刀保持。先补ADR0108与AGENTS/设计/交互规则，无TSX/后端/图存储变化；创建1/退役1，未编译/验证或服务变化，用户刷新手验。

- 当前源码 [GG-303](tasks/GG-303-canvas-prompt-batches.md)：基于03e1b43，隔离88ddc4f在93d731a/GG-302排查之后精确接入为b4a5d6e；图片生成识别`---`/`———`/`－－－`单行，原生hr输出分隔符，空段忽略、参数冻结并发，各段当前图片数/权威报价乘积，不新增批量上限。原节点顺序聚合/活动锁/单段重试，裁剪及图像输入沿各实际结果；JSON有序jobIds/localJobs、全任务权限与刷新恢复，无SQL迁移，原单段4000按段处理。创建1/退役1，无依赖缓存/编译/检查/服务或生产变化，GG-292撤回保持；用户手验，云端批量保存须更新Web后启用。

- 最新排查 [GG-302](tasks/GG-302-canvas-image-quality-audit.md)：以03e1b43只读追踪画布→生成响应→私有preview→存储/已运行Worker，确认画布生成图片使用512px最长边/quality80 WebP且放大不切原图；原生成bytes未重采样，实际像素元数据与请求2K分开。仅排查及文档，未修改代码或运行，创建0/退役0；后续若优化应仅改画布大图读取，保留卡片预览策略，原GG-301及GG-300运行保持。

- 当前源码 [GG-301](tasks/GG-301-text-divider.md)：从b3844d2隔离，6b56d36在GG-300后继d174d54后精确接入为9217c10；有序列表后、撤销前新增分割线，复用StarterKit原生命令，hr显示1px细灰线，Markdown/选择/历史/原编辑与流式锁保持。补充ADR0124，无依赖/后端/迁移或服务变化；创建1/退役1，未编译/验证，用户刷新5173手验，原GG-300运行身份及GG-292撤回保持。

- 当前启用 [GG-300](tasks/GG-300-preset-activation.md)：基于d3a4717，隔离登记a708816精确接入b3844d2；用户授权预设启用且无额外费，checkpoint构建成功、本地仅0062及Web33072→33840已启用预设/保存校验与中断策略。32131/5173版本均verified b3844d25a7a4328d71bf79e9196ecdbbc18a504e，匿名preset-stream合法Origin返回401；无真实生成/测试或生产变化。Vite27464/Worker31280保持，创建1/退役1，临时启动器备份已清理，下一步用户手验；构建指纹见任务卡。

- 当前源码 [GG-299](tasks/GG-299-text-image-preview.md)：基于025196e，隔离d8b40d7精确接入GG-116/5173；文本生成图片hover显示PrivateObjectImage放大图，直接复用图片生成referencePreview样式，保留取消按钮、文本/视频提示。创建1/退役1，无编译/检查或运行变更，用户手验。用户随后明确委托启用GG-297预设，沿原文本生成20积分，无额外预设费用；本地启用工作待后续任务登记。

- 当前源码 [GG-298](tasks/GG-298-text-input-remove.md)：基于e8b26df，隔离884ffdd精确接入GG-116/5173；文本生成图片/文本/视频缩略右上角X，hover/焦点显示及触屏常显，复用removeLinkedReference移除对应连线/撤销/图保存，保留源节点及素材。生成/恢复请求及不可编辑时禁用；无新增上传或生成调用。创建1/退役1，无编译/检查、后端/迁移/服务或生产变化，用户手验。

- 当前源码 [GG-297](tasks/GG-297-text-generation-presets.md)：基于7230935，隔离448c1ed→GG-116 0648cd5；ADR0130扩展模型旁预设，首项structured_reverse/结构化反推，输入区灰Badge可移除、附加文本可空且草稿保持。仅ID/名称进入客户端，后端展开精确指令/长度校验/幂等快照；原JSON草稿复制/保存恢复保留ID。新preset-stream与普通生成共享边界，旧Web404拒绝，避免忽略预设后计费。创建1/退役1，无自动检查、构建/迁移/服务或生产变化；后端与GG-296新0062待委托启用。

- 当前源码 [GG-296](tasks/GG-296-text-cancel-half-credit.md)：基于9a122fd，隔离c16e3bd→GG-116 7b7c9d7；ADR0129取代取消全退，后端行锁/终态确保中断10退款10，成功20、系统失败及租期回收全退，个人资金来源及企业成员额度一致，消费记录/汇总按实际净额，历史取消不追扣。前端停止/取消恢复无左下角解释，实际失败继续显示。新0062只写源码，与GG-292撤回迁移无关；创建1/退役1，无自动检查、构建、迁移或服务/生产变化。下一步按明确委托启用后端并由用户手验。

- 当前修复 [GG-295](tasks/GG-295-text-generation-tooltip.md)：基于d7147c5，隔离2cd651c→GG-116 45c0155；文本生成节点自身根部提供180ms TooltipProvider，覆盖空态/结果和选中NodeToolbar的输入预览，Provider不增加DOM包装。创建1/退役1，无依赖/缓存、自动编译/检查、真实请求或服务/数据库变化；下一步用户刷新点击已有节点复验。

GG-291停止收尾保护同属当前构建：完成后仍在打字时以服务器终态保留成功结果，迟到取消响应不覆盖后一次请求或用户随后的编辑；GG-294仅执行用户委托构建和本地运行启用，没有自动测试或真实生成。

- 当前交付 [GG-294](tasks/GG-294-text-generation-test.md)：基于a15f636，隔离79db1ed→实际GG-116 767e6db。创建1/退役1，无子目录缓存；构建成功，0061新增迁移完成且不运行fixtures，仅替换Web4552→33072，Vite27464/5173和Worker31280/32142保持。两Web版本端点均verified，匿名文本任务GET为401；下一步用户手验，未部署。构建指纹与时间见任务卡。

- 当前源码 [GG-291](tasks/GG-291-canvas-text-generation.md)：基线0e9de05/登记bcfd337，隔离d41e5d3→当前046fa5d/2f6a91f/a15f636，集成于GG-293恢复后fdd13ae。默认拖动/双击编辑，Claude默认/五模型/high、唯一图文视频端口、流式打字/停止/结果编辑及复制/多页/保存恢复、独立文本任务与20积分预留结算/释放；GG-294已构建启用0061/新版Web。源码交付当轮创建1/退役1/零缓存，真实效果待用户手验，未部署。

- 当前源码 [GG-293](tasks/GG-293-revert-prompt-limits.md)：从e06c2aa登记ea7915e，隔离70302b3→实际GG-116/5173 fdd13ae，只恢复GG-292涉及路径至c7c9a57的既有实现，不reset或改写历史。新模型策略/32,000存储/计数建议/全文预览排序与未执行0062已撤回，原有组合4,000/文本16,000规则恢复，ADR0128 Withdrawn、ADR0124恢复。创建1/退役1，未编译/验证；Web/Worker/0060、前序编号/选择/粘贴/裁剪及GG-291独立目录保持，不再要求GG-291保留取消方案。

- 最新文本编号 [GG-290](tasks/GG-290-canvas-text-editor-order.md)：基于`ee4c01e`，登记`b16b417`，隔离源码`b1530e5`→`8675cd9`；当前页文本节点从1连续编号，新建/复制排后，删除闭合间隙，重开沿用已保存顺序。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；旧项目/提示词/裁剪交付保持。

- 最新选区修复 [GG-289](tasks/GG-289-canvas-text-selection-padding.md)：基于`72fb61c`，登记`c82b36d`，隔离源码`e484b71`→`8521bcc`；原padding移至Tiptap可编辑元素，书写外层允许选字，撤去点击focus(end)，保持间距/滚动/占位。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；并行裁剪交付保持。

- 最新裁剪尺寸 [GG-288](tasks/GG-288-canvas-crop-preset-pixels.md)：登记`11d5326`，隔离源码`bd04081`→实际GG-116 `4017ceb`；带W×H预设按目标宽度及自身比例设置真实像素选区，超出原图则等比缩小，通用比例仍取最大区域；遮罩、W/H及导出复用实际选区。创建1/退役1，ADR0126已更新，未编译/验证，无服务/生产变化，用户手验，GG-287/286保持。

- 最新粘贴修复 [GG-287](tasks/GG-287-canvas-text-paste.md)：登记`a9418e4`，隔离源码`8bdc976`→`cc20e8d`；Markdown使用开放Slice替换选区，按光标接续单行，保留多段格式及富文本/代码块原生处理、粘贴元信息。创建1/退役1，未编译/检查，无服务/生产变化，用户手验；GG-286源码及`96557dd`交接保持。

- 最新裁剪细化 [GG-286](tasks/GG-286-canvas-crop-action-color.md)：隔离源码`7a7933d`→实际GG-116 `dcfa3ce`；新会话比例解锁，不自动锁原图比例，通用移除自由/原始比例且3:4置于2:3上方；完成及处理中局部使用action-fg浅色前景。创建1/退役1，未编译/验证，无服务/生产变化，用户手验，ADR0126已更新；并行GG-285/287保持。

- 最新入口收起 [GG-285](tasks/GG-285-hide-generator-reference-add.md)：基于`6d230bf`，登记`5535022`，隔离源码`c3414a3`→`e7ac61a`；仅关闭添加按钮与空附件占位，图片/文本连线和既有预览保持。创建1/退役1，未编译/检查，无服务/生产变化，用户手验。

- 最新裁剪读取修复 [GG-284](tasks/GG-284-canvas-crop-image-fetch.md)：`592c3e6`→`07e1ba3`；生成图解析download-url后直接无凭据读取，签名/字节请求可取消；共享本地桶此前仅32131，已备份并补两种5173 Origin，预检200/匹配ACAO，null仍403。Worker启动也保留5173，忽略启动器同步，无服务重启/构建；定向7/7，真实浏览器复验由用户完成。创建1/退役1，并行GG-283保持，初始撞号已纠正。

- 最新参考复用 [GG-283](tasks/GG-283-generated-reference-reuse.md)：登记`689d7c4`、隔离源码`4fa31f5`已精确集成；前端同assetId共享进行中请求/成功结果，取消一边不影响其他边、失败可重试；后端延迟原图读取/处理至源资产锁及已有副本检查后。前端接入5173，服务端待构建重启；创建1/退役1，无自动编译/检查，无API/SQL/生产变化。

- 最新裁剪 [GG-280](tasks/GG-280-canvas-image-crop.md)：子`7c35dac/7af5bce`→根`a66b46d/a801b6b`→实际5173 `34f10b0/80a7e5e`；名称行上方快捷栏、展开批次定位、图上选区/预设面板与实际像素裁剪File，沿用私有上传/本机恢复/项目保存。新增五组国内/电商预设，无LinkedIn；创建2/退役2，零依赖/构建缓存，未自动编译/检查，用户手验，未部署。

- 最新弹框修正 [GG-282](tasks/GG-282-canvas-folder-rename-dialog.md)：`85b1e88`及后继`88a67a5`/`47940b1`已精确接入5173，统一弹框、标题“重命名”；保存仅局部名称更新、固定按钮宽度及preventScroll恢复焦点，提交保护保持。累计创建2/退役2，未运行编译/检查，用户手验，并行GG-280裁剪保留。

- 最新资产样式 [GG-281](tasks/GG-281-square-canvas-folders.md)：`995359c`→`b560f33`将文件夹样式从data-slot依赖改为button.folderCard，恢复1:1正方形及完整交互/移动状态，已接入5173；创建1/退役1，无服务/后端变化，未自动编译/检查，用户手验。并行GG-280裁剪保持开发中；本任务初始撞号已修正。

- 最新文本缩略 [GG-279](tasks/GG-279-text-reference-thumbnails.md)：文本输入改为54×54px图标缩略，默认隐藏文件名/字数，复用悬停/焦点预览与移除，混合端口/提示词合并保持；已接入5173，创建1/退役1，无后端/服务变化，未自动编译/检查，用户手验。

- 最新入口精简 [GG-278](tasks/GG-278-reference-add-icon-only.md)：移除添加按钮的可见“参考图”文字，仅保留图标，1:1尺寸与预览/上传保持，已接入5173；创建1/退役1，未运行编译/检查，用户手验。

- 最新缩略调整 [GG-277](tasks/GG-277-square-reference-thumbnails.md)：`ad36891`→`07de752`，参考图片缩略与添加入口均为54×54px正方形，悬停预览保持。创建1/退役1，无服务/后端变化，按用户要求未编译或检查，用户手验。

- 当前文本布局 [GG-275](tasks/GG-275-text-editor-layout.md)：从干净`3bbf42e`核验祖先后建立`fix/GG-275-text-editor-layout`，根agent写入/子agent只读。外置元信息/完整书写区、框内右下双斜线32px柄，正文固定14px，精简三项工具栏，旧Markdown保持；修正文本真实尺寸保存。读取GG-276约定前已完成45/45相关检查、局部lint零错误/3既有警告、实际模块200，之后停止自动检查；创建0/退役0，无后端/服务/迁移变化，用户手验。

- 当前纠正 [GG-276](tasks/GG-276-restore-reference-previews.md)：`cb6a4a0`→`3920306`恢复图片生成器54×68px真实缩略与悬停/焦点预览，文本附件/唯一混合端口保持；创建1/退役1，无后端/服务变化。用户要求本次及后续不自动编译/代码检查，手验由用户负责；并行GG-275未提交内容保留。

- 本次恢复 [GG-274](tasks/GG-274-local-restart-after-reboot.md)：从`80b8c0f`必要构建/来源核验后恢复Web，唯一Worker复用`70e10c6`；5173首页/画布/API代理200、两角色readiness五项ok，启动前任务/outbox/冻结/两队列0，迁移0060/原卷保持，WinNAT已恢复Running。创建0/退役0，无产品决定变化。

- 当前画布收口 [GG-273](tasks/GG-273-canvas-editor-inputs.md)：`17ec871`→`e7ae650`、测试`f7369f5`→`f51b6ba`/`397d735`→`b9ce4bf`；文档页头/书写区/状态栏及H1-H3，圆点直接复用原class，生成器仅reference接收图片/文本；旧text目标边保存/恢复规范化。统一160×52px图片/文本/视频附件卡与文件图标，预览/删除/重试保留。相关30项、类型/局部lint/实际模块/必要Web通过，创建1/退役1，无新依赖/SQL/Worker/生产变化，用户验收。

- 当前资料/品牌：[GG-272](tasks/GG-272-account-created-and-brand-row.md) `c4b10b8`：个人信息新增真实只读创建时间（北京时间），桌面字标下移与项目标题同水平线、保留GG-271左侧对齐。22/22、局部lint/三个模块编译与必要Web构建通过，创建1/退役1、无子缓存；Web/5173为verified `c4b10b8`，0060/原云配置/唯一Worker保持，用户验收，未部署。

- 当前文本节点 [GG-268](tasks/GG-268-markdown-text-node.md)：`2580389`及`6238846/804e5dd/6f4b482`，可视化Markdown/选中格式栏/缩放排版、独立text端口、接收预览与前置提示词合并；旧图片参考/自身附加描述保持，多页JSON保存恢复与复制接线。本任务13/13、组合52/52、类型/局部lint/实际模块/必要Web通过，创建1/退役1，ADR0124，无真实生成或浏览器验收。
- 当前资产菜单 [GG-270](tasks/GG-270-canvas-asset-context-menu.md)：子`8e177e6`→根`b1b3d1c`，文件夹自动编号创建/右键改名，所有已保存素材右键删除与既有改名入口；确认/失败保留/刷新、删除文件夹保留资产保持。子19/19/根组合52/52，创建1/退役1，无API或SQL变化。

- 品牌历史收口 [GG-269](tasks/GG-269-wordmark-only.md)：从`001ac1b`隔离修改，`f51777b`→`c30ccb3`；大厅桌面/移动移除独立G，仅保留108px字标，清理图标样式/间距/占位。源码/diff和实际页面/CSS编译通过，创建1/退役1、无缓存，ADR0116/AGENTS/DESIGN_SYSTEM已同步；后续对齐以GG-271/272卡为准。
- 当前字标比例 [GG-267](tasks/GG-267-compact-lobby-wordmark.md)：从干净`27bd4f4`核验祖先后建`fix/GG-267-compact-lobby-wordmark`，源码`0dfd499`。132px收至108px、间距8px，品牌按钮fit-content，移动组合142px；只改三个样式与两处尺寸。源码/diff和实际页面/CSS编译通过，创建0/退役0，无服务/后端变化，用户视觉验收。
- 当前字标交付 [GG-266](tasks/GG-266-geometric-good-good-wordmark.md)：从`26b28af`隔离开发，`b7f27e8`→`4756c7b`；沿用图标G几何的Good Good本地SVG，放在大厅桌面/移动图标右侧，响应式收缩与首页行为保持。SVG解码、局部lint零错误（11既有警告）、实际页面/样式/字标HTTP200通过；创建1/退役1、无依赖/构建缓存，ADR0116/DESIGN_SYSTEM已同步。
- 当前移动修复 [GG-265](tasks/GG-265-canvas-folder-move-membership.md)：从干净`2ff0113`/登记`26b28af`建立子树，`fb7cc90`→`b1f364c`。画布根层过滤已归档素材，确认成功从原位置消失、目标保留同一身份，失败保留及重读/失效归属恢复完整；子与根12/12、局部lint/两模块编译通过，创建1/退役1，无缓存/API/数据库/服务变更。
- 当前图片详情交付 [GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md)：初版`1c9ae74`后用户澄清，从`f10e8b1`隔离修正`c48e68e`→`5409cce`，恢复初次打开/换图/复位完整contain适配，放大可铺满整个舞台；无计数/缩略图动态居中和并行GG-263保持。本轮16/16、相关lint/两模块编译通过，累计创建2/退役2、无缓存，无Web/数据库变更。
- 当前资料交付 [GG-262](tasks/GG-262-profile-inline-edit-layout.md)：从`c0d8d08`/登记后`ee2c9fc`建立隔离分支，`3338fa9`精确回放为`2f0d8fd`；透明下划线编辑、稳定文字/动作网格、无可见滚动条及统一14px图标。12/12、局部lint/两个实际模块编译通过；创建1/退役1、零子缓存，无Web重建/数据库变更，用户验收。
- 当前交付 [GG-260](tasks/GG-260-credit-details-and-free-quota.md) / [GG-261](tasks/GG-261-daily-free-image-quota.md)：从 `c6f6bb9` 登记并创建两子树；UI `dbe7f38`→`e1d7f61`，来源 `936da92`→`d9e5aff`，根接线/微秒分页修复 `9f9d788`。UI15、生成12、来源/M615、账户/报价/导航24、隔离SQL1均通过；相关lint零错误（画布7既有警告）、实际模块编译通过。0060与verified Web完成，子树创建2/退役2、无缓存；免费额度尚未实现/发放。
- Task [GG-258](tasks/GG-258-canvas-detail-minimal.md)：从干净 `821705e` 核对祖先后建立 `fix/GG-258-canvas-detail-minimal`；移除缩放按钮/倍率及无用样式，非生成素材只展示标题和已知尺寸。SSR/导航 10/10、相关 lint 零错误/警告、三个 Vite 模块编译 HTTP 200；保留滚轮/拖动/键盘及真实参数，无新 worktree/依赖/缓存。
- Task [GG-259](tasks/GG-259-random-user-id-stable-edit.md)：独立 `d4ec0be` 回放为 `c6f6bb9`；现有/新增随机六位数字、不重号，常驻铅笔、下方提示预留换行高度。12/12、两组隔离 SQL 2/2、相关 lint、本地 0059 完成，创建 1/退役 1（初始编号/路径更正一次），API 兼容原 Web，不重建服务。
- Task [GG-254](tasks/GG-254-account-identity-editor.md)：子 `bbf26d5` 精确回放为 `422c32f`；用户名默认 mimi、后端六位 ID、内容文字编辑、局部确认/外部撤销、头像确认后上传，撤去个人主页。定向 20/20、资料 SQL 1/1、ID SQL 10/10、相关 lint 完成；0058 与 verified Web `41df2dc` 同步，创建 1/退役 1。
- Task [GG-253](tasks/GG-253-canvas-media-detail.md)：源码 `896bce2`；素材信息独立列、完整适配后的图片平移/滚轮缩放、原比例图片视频缩略列，选中项轻微向左抽出。22/22 导航/播放与 3/3 SSR、相关 lint、五个实际 Vite 模块编译通过，无新增依赖/缓存。
- Task [GG-255](tasks/GG-255-canvas-paste-image.md)：子 `c7d878c`/`31f5290` 精确回放为 `41df2dc`/`d4ea42c`；原生图片 Ctrl+V 复用拖入上传/节点/持久化，body 焦点可直接粘贴，输入/弹层隔离，保留内部复制。子与根 19/19、相关 lint 零错误、四个 Vite 模块编译通过；创建 1（初始路径改名 1 次）/退役 1。
- Task [GG-256](tasks/GG-256-canvas-folder-drop.md)：子 `df7cdf4` 回放为 `5183287`；图面默认光标、查看按钮 grab、图片拖入既有文件夹，pending/成功/失败重试和减少动效完整接线。子与根 8/8、相关 lint 零错误/警告、三个 Vite 模块编译通过；创建 1/退役 1。
- Task [GG-257](tasks/GG-257-canvas-edge-hover-flow.md)：子 `53f1934` 回放为 `6f63a8f`；CSS 覆盖原 animated 基态为静止实线，连线/剪刀 hover 才流动，reduced motion 始终静止。源审阅、实际 Vite CSS 编译通过；创建 1/退役 1，不改变图数据/断线逻辑。
- 共同交接：文档连续性 9/9、diff 检查通过；三子树经 clean/ignored/绝对路径/缓存/服务核对后以 Git remove/prune 退役，其他工作树保留。未执行浏览器验收、全量门禁/构建或真实资源写入。
- Task [GG-252](tasks/GG-252-personal-info-cleanup.md)：`2feef8c` 精确回放为 `4fd9be3`，默认文字资料、删除复制与解释、仅改动后显示操作；默认 goder 例外共享、自定义保持唯一，头像新上传/绑定 2 MB。22/22、lint、必要 Web 构建/同步、0057 已完成，创建 1/退役 1；并行 GG-251 `3e2add5` 保留。
- Task [GG-251](tasks/GG-251-canvas-preview-fit.md)：从 `4152490` 核对 GG-249/250 祖先后创建 `fix/GG-251-canvas-preview-fit`；显式画布边界/完整适配、稍大浮层、按放大后尺寸保留间隙和原位 1.12 倍放大。9/9、相关 lint、实际 Vite 模块编译通过，无新增 worktree/缓存；用户验收。
- Task [GG-250](tasks/GG-250-inline-personal-information.md)：独立 `9ea1002` 精确回放为 `99fb14a`，个人信息直接编辑头像、昵称/用户名并保存/取消；13/13 功能、相关 lint、最终文档 9/9，5173 编译接线通过，辅助目录创建 1/退役 1。保留并行 GG-249 文件及后继 `8ee22d8`。
- Task [GG-249](tasks/GG-249-canvas-media-viewer.md)：从 `e857437` 新建 `fix/GG-249-canvas-media-viewer`，画布图片入口改为受限完整预览、无标题/滚动条的混合媒体轮播；15/15、相关 lint、四个 Vite 模块编译通过，无新增 worktree/缓存，用户验收。
- Task [GG-248](tasks/GG-248-account-personal-information.md)：`b4a34a6` 回放为 `520b452`，六项真实资料、ID/邀请码复制与每次默认入口已接入实际目录；20/20、定向 lint，无全量检查，辅助目录创建 1/退役 1，不改变 GG-245 范围。
- Task [GG-247](tasks/GG-247-targeted-verification.md)：用户要求高频小需求默认定向验证，完整门禁按批次/发布或必要回归执行，规则见 AGENTS/WORKFLOW；不改变 GG-245 的并行开发范围。
- 当前集成分支`fix/GG-275-text-editor-layout`，目录`F:/goodgood-worktrees/GG-116`，当前HEAD含GG-275与已接入GG-276及此前功能并作为下一任务基线；`b9ce4bf`、`3bbf42e`与`3920306`须为祖先。实际verified Web保持`80b8c0f`，免费政策待补，生产未授权。
- Task [GG-246](tasks/GG-246-asset-video-hover.md)：子提交 `c563d98`/根回放 `ec51488` 已整合为 `83a4306`，实际目录 `F:/goodgood-worktrees/GG-116`，基于 GG-244 收口 `dd8dca9`，仅修改大厅资产视频。定向 31/31、一次完整共同门禁 685 通过/22 隔离跳过/0 失败；5173 编译模块 HTTP 200 含新接线；辅助目录创建 2/退役 2。不改变 GG-245 并行任务。
- Task [GG-244](tasks/GG-244-canvas-asset-hover.md)：分支 `fix/GG-244-canvas-asset-hover` 基于 `86ee3b7`；子提交精确回放 `be84c53`、`9d7d18c`，定向 9/9、完整门禁 674/22/0；子目录创建 1/退役 1，沿用 GG-242/243 与云配置。
- Task [GG-245](tasks/GG-245-canvas-image-link-read.md)：子八文件 `e471c1c` 精确回放为 `7ddb78d`；34/34、定向 lint/typecheck、必要 checkpoint 构建通过，实际 cafe24 JPEG 新读取器下载/解码成功（900×1190）。ADR 0122 与原上传/归档保持，本地 Web 同步完成。
- Task [GG-243](tasks/GG-243-project-create-card.md)：独立实现 `f647e13` 及其记录分支已整合到 `F:/goodgood-worktrees/GG-116`；基线为 GG-242 收口 `00f7568`。首位新建卡片取代页头按钮，复用 `/canvas` 新建流程；不修改画布源码。
- 共同整合 `dec0025` 已通过实际运行目录完整门禁：665 通过/22 隔离跳过/0 失败；定向 14/14，5173 编译模块 HTTP 200、包含新卡片和 /canvas 入口。GG-242/243 均为祖先，本任务辅助目录创建 2/退役 2。当前分支名是历史名称，不能单凭名称推断范围。
- Task [GG-242](tasks/GG-242-canvas-image-preview.md)：子 agent 最小源码修复已精确回放为 `c3700b7`，基于 GG-241 `f1570de`，继续保留。GG-240 生命周期规范继续有效。
- 5173源码目录：`F:/goodgood-worktrees/GG-116`，当前累计源码含GG-242—276交付；目录名/旧标签不能代表最新代码，免费quota未实现。
- 5173 API代理：Web `32131`为GG-116 verified `80b8c0f0b41aff4371e4673597bc4b483233e405`，指纹见GG-274；唯一真实开发Worker `32142`保持GG-226 `70e10c6`，将来quota需要同步两角色。文档HEAD不是新构建身份。
- 本地依赖：PostgreSQL `54449`、Valkey `56549`、RustFS `58049/58050`、Mailpit `58045/58046`；数据库迁移为 `0060`，0059随机ID与用户/任务/积分流水保持，0060仅新增授权来源列/约束。
- 云参考图：Web 必须加载仓库外 `cloud-upload.env`，Worker 同样保持 `cloud-development`；否则 23 条 `local-dev/references/` 图像会读取失败，readiness 正常不能代替素材预览验证。
- GG-242 验证：定向 23/23、只读预览 13/13；一次 `check:local` 通过（683 总数，661 通过、22 隔离跳过、0 失败）。浏览器验收交给用户。
- 2026-10-01 启动前只读核对活动任务、待分发 outbox、冻结积分和两队列均为 0；保留原数据卷，没有执行迁移或生成。
- GG-235 已恢复本地媒体只读链路；GG-236 外框已获用户确认；GG-237 和 GG-238 仍需用户在 5173 手验。
- 生产身份继续为 revision `7888554a4650b1b06dbce4293c52e8c018e5c71b`、迁移 `0044_gg098_raise_manual_grant_ceiling.sql`，详见 [CURRENT_STATE](CURRENT_STATE.md)。GG-239 未部署。
- 生产入口仍为 `https://goodgood.o1key.com`，预发布入口为 `https://staging-goodgood.o1key.com`；本地 5173、开发数据库与生产数据继续严格隔离。
- 早期生产实施流水保存在 [2026-09-07 implementation log](history/2026-09-07-implementation-log.md)，仅在追溯历史时读取。
- Next action: 用户刷新5173手验GG-297预设菜单/标签/附加草稿保留；实际预设及GG-296中断10规则待委托应用新0062并构建Web启用。新需求从当前HEAD继续开发，默认不自动编译/检查；免费政策与生产授权另列。
- Blockers: 本地启动无阻塞；免费政策仍缺每日数量和适用模型/规格，浏览器验收由用户负责，生产未获授权。

## Verification sequence

1. 核对当前分支 HEAD，确认 GG-253 `896bce2`、GG-254 `422c32f`、GG-255 `d4ea42c`、GG-256 `5183287` 与 GG-257 `6f63a8f` 均为祖先；交付 `git status --short` 为空。Web/Worker 身份按 CURRENT_STATE/HANDOFF 核对。
2. 核对 `http://127.0.0.1:5173/`、`32131/api/health/version`、`32142/health/ready`；不得凭旧 PID 推断版本。
3. 按 GG-247 默认定向验证；GG-245 检查客户端、公开链接读取与 reference API，实际 Web 同步需要 verified checkpoint 构建，不叠加无关全项目测试。文档流程只运行文档连续性与 diff 检查，准确记录实际结果。
4. 浏览器交互及产品验收由用户完成，覆盖 GG-245 图片链接、GG-244/246 hover 视频、GG-243 首位卡片、GG-242 预览恢复和未确认的 GG-237/GG-238；agent 无需代验。真实生成必须另获该次计费请求授权。
5. 发布是独立任务，必须取得不可变 CI 镜像并按单槽 Compose 清单执行。

## Milestones

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| 生产 GG-098 / GG-100 | 已部署 | controlled alpha 应用 + 单槽 Compose；身份见 CURRENT_STATE |
| GG-101—121 | 本地累计 | 真实本地接口、素材/资产工作区；具体边界见任务卡 |
| GG-122—155 | 本地累计 | Hero、shadcn/AI Elements、独立画布、资产栏与运行兼容 |
| GG-156—189 | 本地累计 | 积分明细、画布交互/持久化、真实生成与 Nano 多图 |
| GG-190—218 | 本地累计 | 画布视觉、批次、模型路由、Seedream、平台币退役与多页面 |
| GG-219—238 | 本地累计 | 导航、项目管理、选择/排列、资产面板和图片查看器 |
| GG-239 | 本地检查点 | 当前 5173 累计源码首次形成单一可恢复提交和标签；未部署 |
| GG-240 | 流程检查点 | 子 agent/worktree 创建、缓存、集成、退役与脏目录保留形成可测试规范；未部署 |
| GG-241 | 本地启动完成 | 原依赖、5173、Web/Worker 恢复，Windows 54449 端口冲突已处理；原数据保留，未部署 |
| GG-242 | 本地预览恢复 | Web 云配置补回；画布重开 generated source 使用稳定受权 content URL，子 worktree 已退役 |
| GG-243 | 已整合实际 5173 并验证 | 首位新建项目卡片直接进入新画布；共同门禁 665/22/0，辅助目录已退役，未部署 |
| GG-244 | 已整合实际 5173 并验证 | hover 小按钮与节点式视频预览；门禁 674/22/0，子目录已退役，未部署 |
| GG-245 | 已整合 5173/Web 并验证 | 受鉴权公开图片链接读取，34/34 与实际 URL 解码通过，verified Web 同步和子目录退役完成 |
| GG-246 | 已整合实际 5173 并验证 | 大厅视频仅 mouse hover 预览，定向 31/31，辅助目录已退役 |
| GG-247 | 验证规范生效 | 小需求默认定向检查，完整门禁用于批次/发布或必要回归 |

## New-session recovery

1. 读 `AGENTS.md`、`CURRENT_STATE.md`、`WORKFLOW.md`、本文件、`BACKLOG.md` 和 `DEVELOPMENT_HANDOFF.md`。
2. 使用 `git worktree list` 和当前分支 HEAD 核对上述 GG-253—257 祖先；GG-245 标签仅为历史来源，不得从目录名、main 或 parked C6 猜测最新源码。
3. GG-243 已整合共同运行目录；新需求核对并分配未占用编号，仅在并行写任务时创建 worktree，并按 WORKFLOW 登记所有权、缓存和退役结果。
4. 本地真实 Worker 可能计费；先检查活动任务、队列和冻结积分，再决定是否启动或切换服务。
5. 生产操作必须另有明确授权，且生产事实以 CURRENT_STATE 和发布记录为准。
