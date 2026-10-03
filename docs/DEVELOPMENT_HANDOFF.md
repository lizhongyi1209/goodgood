# 当前开发版本与跨窗口交接

- 最新建组修复：[GG-325](tasks/GG-325-group-resize-loop.md)从8e9eeb8隔离d6aadee，精确接入GG-116/5173为faaad8a，保留另窗已完成GG-324图片对比da10928/3e34fa7/d92830e。组框明确整像素width/height、框内容独立布局，完整原生measure后按持久坐标拟合；读写分帧、过期计划取消和一像素容差避免重复布局。不屏蔽错误，截图真实observer堆栈缺失，未浏览器复现/编译检查或运行测试，用户刷新再试建组；创建1/退役1，零依赖缓存。Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持，新组云字段仍需另行受权更新Web，无SQL迁移。

- 最新图片对比：[GG-324](tasks/GG-324-canvas-image-compare.md)基线ba73fea，根隔离cdf6c02/97fd038精确接入GG-116/5173为da10928/3e34fa7，保留另窗GG-323分组2fa0486；三类图片共享裁剪右侧对比入口，所选output真实参考优先、资产真实名称搜索/选取、hover分界与键盘触屏完成。当前图右侧/对比左侧、居中等比适配，受权最高2048读图/原512缩略，独立临时Dialog/有界池，关闭/页身份清理和局部错误重试；无上传/生成/保存字段或后端更新。Impeccable沿既有Operate样式，创建1/退役1、零依赖缓存，未运行构建/检查/测试、浏览器/HTTP/SQL/provider或运行/生产操作，用户刷新手验。GG-323云组字段仍待独立授权Web激活；实际GG-322 Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持。

- 最新分组源码：[GG-323](tasks/GG-323-canvas-groups.md)从0b5744d隔离并保留另窗ba73fea，2d51561精确接入当前GG-116/5173为2fa0486。Shift框选工具栏建组/Ctrl-Cmd-G、拖标题整体移动、双击或Enter/F2改名及emoji选择移除，解散/删除框保留成员，复制/裁剪/封面与本机恢复及每页历史适配完成。ADR0135/云group-parentId校验源码已补，无SQL或Worker更新；新云字段待用户另行委托Web激活。创建1/退役1，辅助工作区已归档，零依赖/缓存；未编译、检查、测试运行或浏览器验收，没有服务/provider/数据/生产操作。用户刷新手验；现有GG-322 Web0b5744d/唯一Worker419b097及原Vite/数据/SMTP保持。

- 当前修复/运行：[GG-322](tasks/GG-322-image-slot-sync-compatibility.md)子9920bde→0ce2360接入GG-116；同步失败显示实际平台错误及本机已保存/尚未云同步，不再猜测服务版本。截图由旧Web419b097缺imageSlots校验触发，远端保存失败不会阻断单槽提交。用户授权必要构建及仅Web重启，Web25664/32131、5173代理verified0b5744d，Web readiness五项ok，GG-321云字段已生效；唯一Worker28236/32142仍419b097，Vite33312/5173及原数据0063/cloud-development/local-mailpit保持，无迁移/真实请求/检查或测试。创建1/退役1，辅助目录干净正常移除；用户刷新手验。运行receipt绑定0b5744d，下次启动先构建当前HEAD，不启动旧GG-226 Worker；下方待激活是历史阶段。

- 最新图片插槽：[GG-321](tasks/GG-321-image-result-slots.md)基线ca54019/登记aa4967f，子`/root/image_result_slots`隔离4398d08精确接入当前4489d1d。总数先固定槽/本机flush后逐张并发count1，逐槽合并状态，失败中央重试只一个位置且成功图/输出ID/展开状态保持；未知提交复用key，旧count4失败单槽新submit count1，Seedream原生层保持。15文件，imageSlots云冻结规范输入/任务引用受权及恢复完成，旧Web拒绝时明确仅本机保存。创建1/退役1、子结束/辅助零依赖缓存正常移除，无构建/检查/测试运行、浏览器、SQL/provider或运行操作；用户刷新手验。新云字段须以后更新Web，无迁移/Worker更新，当前GG-319 Web/唯一Worker419b097和原Vite/数据/SMTP保持。

- 最新邮件核对：[GG-320](tasks/GG-320-local-email-delivery-audit.md)只读确认当前local-mailpit；11:18验证码请求202、邮件已进入http://127.0.0.1:58045/，真实QQ邮箱不会收到。没有重发/读取正文或切换SMTP，GG-319运行不变。

- 最新本地运行：[GG-319](tasks/GG-319-local-restart-after-reboot.md)：GG-319电脑重启恢复完成：Docker原E盘数据目录恢复，原依赖healthy；构建419b097，Web28248/32131、唯一Worker28236/32142和Vite33312/5173可用，API代理verified、readiness均ok。GG-318已启用，无迁移/数据重置/测试/真实请求或部署，用户继续手验。

- 最新失败诊断：[GG-318](tasks/GG-318-generation-failure-diagnostics.md)基于ea71443，登记4a2017f→9121d32、隔离4443b25→当前a627d7f。HTTP/网络/JSON/协议/上游失败/超时和输出错误元信息脱敏，Worker关联阶段/尝试/路由，随既有最终失败/备用切换事务保存；站长总日志任务详情最多50条再次脱敏读取，普通用户错误/积分/请求策略保持。创建1/退役1，辅助工作区干净退役；仅写代码/回归来源和文档，未编译、检查、测试/浏览器或运行/生产操作，无迁移/真实请求。当前Web287c4ca/0063、原Vite/唯一Worker70e10c6保持；须用户另行委托同步更新Web和唯一Worker才开始捕获新失败，旧HTTP详情无法回填，不自动重试。

- 最新排查：[GG-317](tasks/GG-317-canvas-three-prompt-audit.md)只读核对当前分组/提交及127.0.0.1:54449/goodgood真实记录，22:34批次确有3条有序任务，摸头/坐着成功1张、半蹲CAPACITY_BUSY失败0张/无上游任务ID；失败账本reserve -20/release +20净0。不是两组上限；原始HTTP状态未留存，不断言具体限流状态。创建0/退役0，无代码改动、自动重试、provider请求、测试/编译、迁移或重启，临时审计脚本清理。GG-316/315及前序源码、GG-309 Web287c4ca/0063、原Vite/唯一Worker保持；用户可选中生成器仅重试失败第2段。

- 最新查看图标修正：[GG-316](tasks/GG-316-canvas-view-icon-consistency.md)登记5b05e92→fd69d74，隔离04aa7e0精确接入GG-116/5173为3a823d8；共用查看按钮逆向补偿zoom，24px/14px/7px圆角/5px边距按屏幕固定，共享expand白底#fff，原hover/focus/触屏和大图详情保持。创建1/退役1，无依赖/辅助缓存，未编译、检查、HTTP/浏览器或真实请求，无后端/运行变化；用户刷新手验。GG-315文字误报修正、GG-312的300%高清门槛及前序源码保持，Web287c4ca/0063和原Vite/唯一Worker沿GG-309证据。

- 最新模板修复：[GG-315](tasks/GG-315-text-template-media-error.md)登记42d1c62，隔离c42ef94精确接入GG-116/5173为5be1e21；AssetMedia原仅排除audio，导致text没有媒体URL时误报图片失败，改为明确image/video才显示媒体错误/重试。正常1:1文字缩略/全文及真实文本错误、图片/视频回退保持，无API/存储变化。创建1/退役1，零依赖/辅助缓存，未编译或验证、HTTP/浏览器、运行或生产操作；用户刷新既有资产手验，无需重存模板或更新Web。GG-314/313/312/311及GG-309 Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新图片入口：[GG-314](tasks/GG-314-canvas-image-view-button.md)登记b423afd→349070a，隔离3294d11精确接入GG-116/5173为0a66ee3；三类图片节点复用资产24px/14px hover查看按钮和现有canvas ImageViewer。上传/资产图用私有content/本地源；生成批次按job顺序和实际input展示，展开逐张入口/收起最前图，未就绪/裁剪中禁用，按钮事件独立，关闭/Escape回按钮，叠图绝对定位保持。创建1/退役1，无依赖/辅助缓存，未编译、检查、HTTP/浏览器或真实请求，无后端/运行变化；用户刷新手验，无需重启Web。并行GG-313命名及GG-312的300%门槛保持，Web287c4ca/0063和原Vite/唯一Worker沿GG-309运行证据。

- 最新命名参考：[GG-313](tasks/GG-313-prompt-template-name-guidance.md)登记a04caf9，隔离215422f精确接入GG-116/5173为024e139；ADR0133先补命名决定，共享保存弹窗名称初始空白，placeholder显示「用途_主题_风格，例如：商品主图_护肤品_极简白底」。仅参考不强制三段，示例不是字段值，原空名禁用/冻结全文/重试保存及成功动效保持。创建1/退役1，零依赖/辅助缓存，未编译或验证、运行/数据或生产变化；用户刷新重开手验，GG-312/311及GG-309 Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新预览门槛：[GG-312](tasks/GG-312-canvas-preview-zoom-threshold.md)登记19aad19→2992b99，隔离0921ca9精确接入GG-116/5173为aeff94d；ADR0132先补用户300%门槛，统一实际zoom>=3才允许最高2048，向上稳定180ms、缩回立即512，节点尺寸/像素密度不提前加载。保留视野/隐藏叠图/身份缓存/加载失败小图层，移除无用途的尺寸观察。创建1/退役1，未编译、检查、HTTP/浏览器或真实请求，无后端/运行/生产变化，无需重启后端；用户刷新手验299%/300%边界。并行GG-310/311及GG-309已启用Web287c4ca/0063、原Vite/唯一Worker保持。

- 最新交互源码：[GG-311](tasks/GG-311-prompt-template-save-and-asset-filter.md)登记07d867d，隔离232ce8e精确接入GG-116/5173为6e089c3；共享弹窗「保存提示词模板」/名称/保存，无预览，GG-310前景色保持。受权成功事件携带新增ID，资产入口短暂灰阶接收动效/提示，减少动态效果静态；面板右上×改全部/图片/视频/音频/提示词模板筛选，联合原文件夹身份、空结果恢复和焦点返回，列表1:1文字缩略保持。创建1/退役1，零依赖/辅助缓存，未编译或验证、API/迁移/运行及生产操作；用户刷新手验，本地Web287c4ca/0063与原Vite/唯一Worker沿GG-309证据保持。

- 最新弹窗修复源码：[GG-310](tasks/GG-310-text-template-dialog-copy-color.md)登记a19be42，隔离45bbba9精确接入GG-116/5173为c3ba0d2，保留GG-309 f5b0b59；设置模板重复说明仅供无障碍读取，操作区显式取消ink/保存action-fg，覆盖两类文本节点及保存中文字。创建1/退役1，无依赖/辅助缓存，未编译或验证、运行/数据或生产变化，用户刷新并重开弹窗手验；已启用Web/本地0063的事实沿下条GG-309记录。

- 当前本地运行：[GG-309](tasks/GG-309-canvas-preview-activation.md)按用户重启请求，已构建并启用verified 287c4ca、本地Web40244/必要0063；动态最高2048预览、GG-303云端批量校验及GG-308文本API生效，用户手验。仅修复实际构建阻塞的重复zoom声明，Vite27464/唯一Worker31280、cloud-development/local-mailpit及数据保持；创建2/退役2，无测试、浏览器、真实provider请求或生产操作。两版本端点均verified，匿名两类canvas-preview均401。运行receipt仍绑定287c4ca，下次重启先构建当前HEAD；下方原任务待启用为历史交付状态，构建指纹见GG-309。

- 最新文本资产源码：[GG-308](tasks/GG-308-canvas-text-template-assets.md)基于e7e1f6f，登记61895c5、隔离e95c52c→GG-116/5173源码4317bdb。单击两类文本节点显示设置模板快捷栏、双击/键盘编辑才显示格式栏；冻结当前完整内容/UUID保存私有text资产，两处资产列表1:1裁切文字缩略/全文查看、资产页Markdown下载和原整理删除、画布重命名及拖入独立文本节点完成。创建1/退役1，必要回归来源只写未运行，无依赖/构建缓存、编译/验证或运行/生产操作。新的text-assets API和0063迁移须后续明确委托更新Web/应用本地迁移，旧Web的媒体列表可读且模板保存明确失败；可连同GG-303云端批量校验/GG-306高清接口一起启用，不增加Worker或provider请求。当前GG-300 Web b3844d2/本地0062/唯一Worker沿原运行证据保持，本轮未探测或激活。

- 最新显示源码：[GG-306](tasks/GG-306-canvas-adaptive-preview.md)从5a4fb15隔离3e75204精确接入GG-116/5173为f004e5f，保留并行GG-307 ebd8ace。资产拖入默认512，上传/生成结果共用视野/显示需求的按需2K组件，最长边2048，保留小图层，3并发/8闲置URL身份缓存，原实际尺寸不改为预览尺寸。新canvas-preview私有固定2K接口无SQL/存储写入；当前Web b3844d2未启用该接口，失败保留512，远程高清须后续用户委托构建/更新Web，可与GG-303云端批量校验一并启用。创建1/退役1，无编译/检查、浏览器或真实请求/运行变化，用户手验，原Worker/本地0062/配置数据及生产保持。

- 最新详情修正：[GG-307](tasks/GG-307-hide-banana-thinking-details.md)基于09dbe13，登记e3fdb6d、隔离0e6d4f2→GG-116/5173所用源码ebd8ace；Banana 2大图思考条目始终隐藏，包括high记录，生成快照/请求与其他GG-305规则保持。ADR0123先补覆盖要求，既有回归断言只改未运行；创建1/退役1，无依赖/构建缓存、编译/验证或后端/运行变化，用户刷新手验。GG-306独立工作区未动；GG-303待更新Web及GG-300原运行保持。

- 最新详情修复：[GG-305](tasks/GG-305-canvas-viewer-used-parameters.md)基于1387b4c，登记ea78337、隔离167e864→GG-116/5173所用源码5a4fb15；大图只显示该job.input对应模型支持且使用的参数，Banana/Seedream隐藏GPT默认项，关闭搜索/低思考占位/空参考图隐藏，GPT实际记录值及型号质量范围保留。用户确认暂不处理预设。创建1/退役1，无依赖/构建缓存、编译/验证、生成请求或后端/运行变化；回归来源只写未执行，用户刷新手验。无需后端启用；GG-303云端批量校验待更新Web及GG-300 b3844d2/本地0062/唯一Worker状态保持。

- 最新拖线样式：[GG-304](tasks/GG-304-canvas-connection-drag-flow.md)基于31be3bd，登记a91b200、隔离30790ea→GG-116/5173源码0ad78b0；拖线预览与hover共用亮蓝/7 4/1.3s流动，reduce亮色静止实线，原连接几何/完成线条/剪刀与保存保持。创建1/退役1，无依赖/构建缓存、编译/验证/运行或后端变化；用户刷新手验，当前GG-300运行及GG-303云端批量校验待更新Web状态保持。

- 最新批量源码：[GG-303](tasks/GG-303-canvas-prompt-batches.md)基于03e1b43，隔离88ddc4f精确接入GG-116/5173为b4a5d6e，保留93d731a清晰度排查。中英文独占分隔行/原生分割线、并发单段任务、图片/积分乘积、顺序结果/单段重试及jobIds保存恢复完成。创建1/退役1，回归来源只写未执行，无编译/验证、依赖缓存、迁移、构建、重启或生产变化。当前GG-300 Webb3844d2/本地0062/原唯一Worker保持；旧Web不接受jobIds，云端批量保存待用户更新Web后启用，不自动处理。用户手验并发、数量/报价、状态/裁剪及恢复，原有单段接口门禁保留且不新增批量上限。

- 最新排查：[GG-302](tasks/GG-302-canvas-image-quality-audit.md)确认画布生成器/结果节点显示output.previewUrl→私有preview端点，最长边512px、WebP quality80，放大不切原图。生成存储保留上游bytes，2K请求与解码实际尺寸分别保存。仅排查/文档，无编译/检查、用户图片读取或运行改动；后续画布清晰度修复范围应保留资产/附件预览策略，当前GG-301源码及GG-300运行保持。

- 最新编辑快捷源码：[GG-301](tasks/GG-301-text-divider.md)从b3844d2隔离6b56d36，在GG-300后继d174d54后精确接入GG-116/5173为9217c10：有序列表旁分割线原生命令入口、1px细灰hr、撤销分组位置保持。创建1/退役1，无依赖/构建缓存，未编译/验证、后端/迁移/服务或生产变化；用户刷新双击编辑后手验。GG-300的verified b3844d2/本地0062/Web33840及唯一Worker保持，本任务未构建或运行探测。

- 最新本地启用：[GG-300](tasks/GG-300-preset-activation.md)按用户委托构建b3844d25a7a4328d71bf79e9196ecdbbc18a504e，应用仅本地0062并将Web33072替换为33840；GG-297预设/保存校验及GG-296中断10规则已启用，预设仍一次20积分无额外费。32131/5173版本均verified，匿名preset-stream合法Origin返回401；GG-299图片hover及GG-298取消在同一构建。创建1/退役1，无测试/全面检查/浏览器或真实生成，原Vite27464/Worker31280及配置数据保持；用户刷新手验。文档后继不改变receipt，重启前仍按新HEAD构建。

- 最新源码：[GG-299](tasks/GG-299-text-image-preview.md)d8b40d7已接入GG-116/5173，文本生成图片hover改为放大图，直接复用图片生成referencePreview样式，保留取消按钮。创建1/退役1，无编译/检查，用户手验。用户随后委托启用GG-297预设，明确无额外积分收费，待本地启用任务。

- 最新源码：[GG-298](tasks/GG-298-text-input-remove.md)从e8b26df隔离884ffdd精确接入GG-116/5173；文本生成chat图片/文本/视频缩略可取消，沿图片生成右上角圆形X，复用removeLinkedReference取消对应连线及撤销/图保存，保留源节点/资产。生成及恢复请求时锁定；创建1/退役1，无编译/检查/后端/服务变化。用户刷新手验取消、撤销及保存恢复；GG-296/297后端待启用状态保持。

- 预设源码：[GG-297](tasks/GG-297-text-generation-presets.md)从7230935隔离448c1ed精确接入GG-116/5173；模型旁结构化反推、可移除Badge、额外提示词可空，后台隐藏指令及复制/保存恢复。原开发创建1/退役1，未自动编译/检查；后继GG-300已按用户委托构建/本地0062/Web启用，20积分无额外费，用户手验。

- 中断源码：[GG-296](tasks/GG-296-text-cancel-half-credit.md)从9a122fd隔离c16e3bd精确接入GG-116；中断扣10退10/成功20/系统失败0，退款来源/额度和净额统计一致，停止无左下角解释。原开发创建1/退役1，未自动编译/检查；后继GG-300构建/本地0062/Web已一并启用，历史取消不追扣。该0062独立于GG-292撤回，唯一Worker及生产保持。

- 最新修复：[GG-295](tasks/GG-295-text-generation-tooltip.md)从d7147c5隔离2cd651c精确接入GG-116/5173；文本生成节点根部补TooltipProvider，修复选中带连接输入节点时报错，180ms延迟沿用已有预览。创建1/退役1，无编译/检查/服务或数据库变化；用户刷新后点击已有节点复验，无需重新生成。当前Web仍verified 767e6db，本地0061与唯一Worker保持。

- 当前交付：[GG-294](tasks/GG-294-text-generation-test.md)基于a15f636，隔离79db1ed→实际GG-116 767e6db，菜单为文本编辑→文本生成→图片生成。用户明确委托构建，checkpoint构建成功，本地0061已应用，32131 Web/5173代理均verified 767e6db；仅Web4552→33072，原Worker31280/32142、Vite27464/5173和云配置/数据保持。创建1/退役1，无依赖安装/子缓存、测试/浏览器验收或真实生成，未部署。构建完整指纹及本地迁移边界见任务卡。

- 当前文本源码：[GG-291](tasks/GG-291-canvas-text-generation.md)三类名称/双击编辑、五模型/Claude默认/high/唯一混合端口、流式/停止/Markdown结果与保存恢复、固定20积分交易已随GG-294构建及本地0061/Web启用；视频以最多6帧处理，不含音轨。原源码交付当轮创建1/退役1/零缓存，后继激活另记GG-294，实际生成/视觉效果待用户手验。

- 当前撤回源码：[GG-293](tasks/GG-293-revert-prompt-limits.md)登记`ea7915e`、隔离`70302b3`→实际GG-116/5173源码`fdd13ae`。用户取消GG-292，恢复此前实现/原有4,000组合与16,000文本规则，新模型策略/计数/预览排序与未执行0062源码已移除；ADR0128已Withdrawn。创建1/退役1，零依赖/构建缓存，未编译/验证或服务变更，Web/Worker/0060保持，未部署。当前不激活GG-292，用户刷新手验。

- GG-291已在GG-293恢复后的fdd13ae上精确接入；0061归其独立文本任务，辅助目录已退役。GG-293未触碰其未提交内容。此前要求保留GG-292共享策略/32,000容量/预览排序的指引已撤销；不要通过旧cherry-pick重新引入已取消方案或应用已移除0062。前序文本编号/选择/粘贴/裁剪保持。

- 最新裁剪尺寸：[GG-288](tasks/GG-288-canvas-crop-preset-pixels.md) `bd04081`→`4017ceb`已接入当前GG-116/5173源码，带具体尺寸的预设按像素设置居中选区，超出原图等比缩小，通用比例保持最大区域。创建1/退役1，无依赖/服务变化，未编译/验证；用户刷新重开裁剪手验W/H、遮罩及导出。此前GG-286/287、原Web/Worker/0060保持，未部署。

- 最新裁剪细化：[GG-286](tasks/GG-286-canvas-crop-action-color.md) `7a7933d`→`dcfa3ce`已接入当前GG-116/5173源码，默认自由裁剪、通用移除自由/原始比例并补3:4、完成及处理中使用action-fg浅色文字。创建1/退役1，无依赖/服务变化，未编译/验证；用户刷新并关闭旧裁剪会话后重开手验。并行GG-285/287、原Web/Worker/0060保持，未部署。

- 最新读取修复：[GG-284](tasks/GG-284-canvas-crop-image-fetch.md) `592c3e6`→`07e1ba3`，修复生成图片裁剪的Failed to fetch；受权原图直链读取、请求取消和中文连接错误完成。隔离RustFS桶CORS备份见任务卡，仅补5173；源码与两个忽略local-checkpoint-portfix启动器均让Worker保留5173。7/7针对性回归及GET预检200，无局部编译/服务重启，创建1/退役1；真实浏览器连接器不可用，用户刷新复验。并行GG-283参考复用的服务器待构建状态保留，Web80b8c0f/原Worker/0060/生产不变。

- 最新裁剪：[GG-280](tasks/GG-280-canvas-image-crop.md)，子`7c35dac/7af5bce`精确接入5173为`34f10b0/80a7e5e`；元信息上方快捷栏/展开批次定位、图上选区与W/H/比例锁/分组预设、真实PNG File及原上传/本机恢复/快照接线完成。五组国内/电商预设、无LinkedIn；创建2/退役2，零缓存/新服务，未运行任何编译或检查。当前源码与并行GG-279/281/282保持，原Web80b8c0f/唯一Worker/0060不变；下一步用户刷新画布手动验收，未部署。

- 最新文本布局：[GG-275](tasks/GG-275-text-editor-layout.md)，从`3bbf42e`隔离至`fix/GG-275-text-editor-layout`；外置元信息、完整书写区、右下双斜线柄，精简三项工具栏/内置页脚，正文固定14px，真实尺寸保存已修正。读取GG-276约定前已完成45/45相关检查、局部lint/实际编译，此后不自动检查；子agent只读，创建0/退役0，无后端/依赖/数据/服务变化。并行GG-276`3920306`/`f9965da`及用户手验约定保持。

- 最新恢复：[GG-274](tasks/GG-274-local-restart-after-reboot.md)，2026-10-02电脑重启后恢复原依赖、5173、Web和唯一Worker；Web严格核验要求必要构建至`80b8c0f`，原GG-273源码指纹不变。Windows动态保留范围覆盖56549，经管理员临时停止WinNAT恢复原Valkey端口并恢复WinNAT Running；原卷/0060/云配置保持，无迁移或生成。

- 最新画布修正：[GG-273](tasks/GG-273-canvas-editor-inputs.md) `e7ae650/f51b6ba/b9ce4bf`：文档编辑器/H1-H3/一致圆点，生成器唯一接收端兼容图片文本和旧边；统一文件附件卡复用既有视频附件。30项相关检查、类型/lint/模块与必要构建通过；创建1/退役1，无新依赖/缓存。当前Web verified `b9ce4bf`，0060/云配置/唯一Worker保持，未部署，用户验收。

- 最新账户/品牌：[GG-272](tasks/GG-272-account-created-and-brand-row.md) `c4b10b8`：个人信息新增真实只读创建时间（北京时间），桌面字标下移与项目标题同水平线、保留GG-271左侧对齐。22/22、局部lint/三个模块编译与必要Web构建通过，创建1/退役1、无子缓存；Web/5173为verified `c4b10b8`，0060/原云配置/唯一Worker保持，用户验收，未部署。

- 日期：2026-10-02。
- 最新画布：[GG-268](tasks/GG-268-markdown-text-node.md)文本编辑器与提示词输入、[GG-270](tasks/GG-270-canvas-asset-context-menu.md)文件夹创建及右键管理已进入5173；52/52、类型/局部lint、六个Vite模块和必要构建通过。两个隔离目录均退役，根锁解析缓存48675253字节已清理。本次Web为`b1b3d1c` verified/readiness200，0060/原cloud配置/唯一Worker保持。后继GG-272及当前Web身份见其任务卡。
- 品牌历史：[GG-269](tasks/GG-269-wordmark-only.md) `f51777b`→`c30ccb3`，大厅桌面/移动仅展示108px Good Good字标，移除独立G及占位；源码/diff与5173页面/CSS编译通过，创建1/退役1，无缓存/服务变更；后续对齐见GG-271/272。
- 最新比例：[GG-267](tasks/GG-267-compact-lobby-wordmark.md) `0dfd499`，字标收小至108px/约14px、间距8px，侧栏Logo按内容宽度展示、移动组合142px；只改三个CSS样式和两处尺寸，源码/diff与5173页面/CSS编译通过，创建0/退役0、无缓存/服务变更。
- 最新字标：[GG-266](tasks/GG-266-geometric-good-good-wordmark.md) `b7f27e8`→`4756c7b`，大厅桌面/移动品牌图标右侧使用Good Good本地矢量字标，G沿用图标几何、o/d匹配笔画。SVG/局部lint（零错误、11既有警告）/页面与CSS编译及字标HTTP200通过；创建1/退役1，无依赖/构建缓存，约11.7MiB辅助目录及临时PNG已清理。ADR0116/DESIGN_SYSTEM已同步，无Web重建或数据库变化。
- 最新移动修复：[GG-265](tasks/GG-265-canvas-folder-move-membership.md) 子`fb7cc90`→根`b1f364c`，画布根层仅未归档/失效归属素材，移动确认后原位置消失、目标保留同一素材，失败/重读规则保持。子与根12/12、局部lint/两模块编译通过，创建1/退役1、零缓存；无API/数据库/服务变更。
- 最新积分交付：GG-260 UI `e1d7f61`、GG-261来源 `d9e5aff` 与根接线/分页修复 `9f9d788` 已进入5173及verified Web，当前余额/类型/项目/模型/任务ID复制、20条前后分页、空心图标和普通选中字重完成。67项相关检查、必要构建/0060与创建2/退役2完成；免费政策待用户，尚未实现或启用。
- 最新账户交付：[GG-262](tasks/GG-262-profile-inline-edit-layout.md) `3338fa9`→`2f0d8fd` 透明下划线编辑、固定网格/动作位置、无可见滚动条和14px图标已进入5173，保留明确确认/外部取消与规则预留。12/12、局部lint及两模块编译通过，创建1/退役1、无缓存；GG-259随机六位ID保持，无数据库/服务变动。
- 当前详情后继：[GG-264](tasks/GG-264-image-detail-fill-and-centered-rail.md) 澄清修正`c48e68e`→`5409cce`已进入5173：默认完整适配，放大可填满整个中间区，保留无计数和当前缩略图含首尾动态居中。本轮16/16、相关lint/两个模块编译通过，累计创建2/退役2、无缓存；无Web/数据库变更。
- 最新画布交付：GG-253 `896bce2` 图片自由预览与真实信息、GG-255 `d4ea42c` 原生图片粘贴、GG-256 `5183287` 文件夹拖入及动效、GG-257 `6f63a8f` 默认实线/hover 流动均进入 5173；定向 25/25、19/19、8/8 及相关 lint/模块编译完成。三个子 worktree 创建 3/退役 3，无依赖/构建缓存残留，浏览器验收交用户。
- 最新追加：[GG-254](tasks/GG-254-account-identity-editor.md) `422c32f` 单一用户名默认 mimi、六位 ID 和局部确认/外部取消已进入 5173 与 verified Web；20 项相关检查、资料 SQL 1/1、ID SQL 10/10、局部 lint 通过，本地迁移到 0058，辅助目录退役。并行 GG-253 `896bce2` 与 GG-255 `41df2dc` 保留，文档后继不改变实际 Web 构建身份。
- 当前追加：[GG-250](tasks/GG-250-inline-personal-information.md) `99fb14a` 已在个人信息内直接编辑头像、昵称/用户名并保存/取消，13 项功能、局部 lint 和最终文档 9/9；辅助目录退役，GG-249 后继 `8ee22d8` 保留。
- 当前代码：GG-239累计及GG-242—282已集成源码；实际GG-116当前HEAD为下一任务基线，最新裁剪`34f10b0/80a7e5e`与并行任务保留，各历史验证证据保留，免费quota未实现。
- 当前交接检查点分支：`fix/GG-275-text-editor-layout`，实际目录GG-116；当前HEAD是下一任务基线，当前verified Web为GG-309 `287c4ca`。文档后继不改变运行receipt，下一次重启前需构建当前HEAD，不伪造构建身份。
- 当前 worktree：`F:/goodgood-worktrees/GG-116`。目录名是历史名称，不能再用来判断版本。
- 状态：当前画布请求已开发并精确集成；2026-10-02用户要求后不自动执行编译或检查，最新任务明确未验证，由用户手验。子目录经clean/路径/进程条件后以Git remove/prune退役，未部署生产。

## GG-245 公开图片链接交付

受鉴权同源 `POST /api/references/read-link` 读取公开 JPEG/PNG，保留原 File 上传与归档；公开 DNS 逐跳固定，时间/字节/真实解码及取消边界见 [ADR 0122](decisions/0122-authenticated-public-image-link-read.md)。34/34、定向 lint/typecheck、必要 checkpoint 构建通过；所给 cafe24 图片为 900×1190，已只读解码，未导入真实资产。Web 和代理健康身份/未登录 401、编译组件接线通过。子目录创建 1/退役 1，零子缓存，详见 [任务卡](tasks/GG-245-canvas-image-link-read.md)。

## GG-246 大厅资产视频交付

大厅 `/assets` 视频的独立提交 `ec51488` 已共同整合为 `83a4306`，默认中心播放提示、真实鼠标 hover 才播放，网格与列表共用。定向 31/31、共同完整门禁 685/22/0，编译模块 HTTP 200 确认新接线；辅助目录创建 2/退役 2，无辅助依赖或构建缓存。仅修改大厅资产模块，GG-244 画布文件和 GG-245 后续范围保留。见 [任务卡](tasks/GG-246-asset-video-hover.md)。

## GG-244 当前交付

子 agent 的五文件提交已精确接入当前 5173，24px 查看入口、无视频外置标签、节点式视频卡内 hover/明确预览完成。子与根定向 9/9、完整门禁 674/22/0，子目录创建 1/退役 1、无子依赖或构建缓存。修改规范见 [ADR 0120](decisions/0120-canvas-asset-hover-video-preview.md)，证据见 [任务卡](tasks/GG-244-canvas-asset-hover.md)。不由 agent 进行浏览器验收。

## GG-243 大厅并行工作

独立大厅实现 `f647e13` 已在 GG-242 收口 `00f7568` 后整合为共同提交 `dec0025`，源码进入下表实际 5173 目录。保留双方源码和记录，不切换目录分支、不替换 Vite/Web/Worker。项目入口按 [ADR 0119](decisions/0119-project-create-card.md) 改为首位新建卡片，点击 `/canvas`。共同完整门禁 665/22/0、定向 14/14；编译模块已确认包含新卡片。子目录与独立大厅辅助目录已退役，分支/提交保留。[任务卡](tasks/GG-243-project-create-card.md) 保留完整证据。用户负责浏览器和预期验收。

## 先确认源码

~~~powershell
Set-Location F:/goodgood-worktrees/GG-116
git status --short --branch
git show goodgood-local-2026-09-30-gg239 --no-patch --oneline
git merge-base --is-ancestor goodgood-local-2026-09-30-gg239 HEAD
git worktree list --porcelain
~~~

新窗口以 IMPLEMENTATION_PLAN 指向的共同运行分支 HEAD 为检查点，并确认 GG-242 `00f7568` 与 GG-243 `f647e13` 都是其祖先。`main`、旧 GG-116 分支、其它 GG worktree 和 parked C6 都不是替代来源。新任务先核对未占用编号，只在并行写任务时建立独立 worktree，不要让两个窗口编辑同一目录。

当前分支也须包含 GG-245 `7ddb78d`、GG-248 `520b452`、GG-254 `422c32f` 和 GG-260/261 `9f9d788`。构建receipt严格绑定Git提交；HEAD与receipt不同时，Web重启前先按 `npm run build:checkpoint` 构建并核对，不伪造revision。现有Web为已验证287c4ca，指纹见GG-309；文档后继不需要立即重启服务。

## 当前本地运行

| 组件 | 入口 | 当前来源/用途 |
| --- | --- | --- |
| Vite 页面 | `http://127.0.0.1:5173` | GG-116当前分支含GG-242—276已交付范围，热更新 |
| Node Web | `http://127.0.0.1:32131` | GG-116 verified419b097；见GG-319 |
| Worker | `http://127.0.0.1:32142/health/ready` | GG-116 verified419b097唯一真实Worker，GG-318已启用；旧GG-226不再启动 |
| PostgreSQL | `127.0.0.1:54449/goodgood` | 原隔离数据/本地0063保持，GG-319无迁移 |
| Valkey | `127.0.0.1:56549/db0` | 本地队列/缓存 |
| RustFS | `127.0.0.1:58049/58050` | 本地素材对象存储 |
| Mailpit | `127.0.0.1:58045/58046` | 本地邮件开发 |

进程 ID 可能变化，恢复时重新查询端口和健康接口。`32131/api/health/version` 必须返回 `build.verified=true`；Worker readiness 的 runtime/database/objectStorage/provider/queue 必须均为 `ok`。

GG-241 在 2026-10-01 已核对上述健康状态及 5173 首页、`/canvas`、API 代理。启动前活动任务/outbox/冻结/两队列均为 0；迁移仍为 56。Windows 重启后可能把 54449 划入动态保留范围，不能因此重置数据；具体端口恢复证据见 [GG-241](tasks/GG-241-local-startup.md)。

## 当前功能边界

GG-239 包含 5173 中 GG-116—238 的累计本地实现。核心包括统一资产工作区、独立画布、图片/视频/音频节点、参考连接、生成器、批次、模型参数、持久项目与页面、项目管理、导航、积分明细和近期资产/项目视觉调整。每个任务的范围、被取代关系和验证证据都在 [BACKLOG](BACKLOG.md) 链接的任务卡中。

近期状态：

- GG-235：本地 RustFS/Valkey 发布端口已恢复，媒体只读抽查通过；UI 瀑布流与视频首帧待手验。
- GG-236：项目卡片默认浅灰外框已获用户确认。
- GG-237：内容宽度达到 960px 时项目四列、封面 4:3；待手验。
- GG-238：画布资产方形添加卡、图片显式查看器和竖向图片 rail；待手验。
- GG-239：只固化当前代码、清理入口文档和临时浏览器日志，不改变产品决定或生产运行。
- GG-240：只增加子 agent/worktree 生命周期、缓存与退役规范和文档契约测试，不改变产品决定或运行时。
- GG-241：恢复原本地服务和数据卷，复用已验证后端；没有安装依赖、构建、迁移、上传或生成。
- GG-242：补回 Web 云参考图配置；13 张既有图像预览/原图只读抽查通过，子 agent 的单行生成图片恢复修复已整合。

## 启动和验证边界

首次设置或切换检查点后使用锁文件安装依赖：

~~~powershell
npm ci
npm run dev:local
~~~

当前依赖已安装时无需为了恢复页面重复安装。按 GG-247 默认只执行相关定向验证，完整门禁用于批次/发布收口、确需全面回归或用户要求；后端运行改变才进行必要的 checkpoint 构建。agent 负责代码开发、代码验证和集成；浏览器交互、视觉效果及是否符合预期由用户验收，除非用户明确委托。真实 provider 请求必须由用户明确授权该次生成；自动测试不得写入真实 Worker 共用数据库或队列。数据库写测试只允许显式命名的空白隔离栈且无真实 Worker。

本机 Valkey 为 56549。GG-116 的两个忽略启动器用于 Web `dist/local-checkpoint-portfix.mjs start workspace` 和 Vite `dist/local-live-dev-portfix.mjs --port 5173`；GG-319后唯一Worker也使用GG-116的 `dist/local-checkpoint-portfix.mjs start worker`，旧GG-226不再启动。先核对构建和任务/队列，再启动所需角色，不重复启动 Worker，不用仍断言 56449 的旧入口。日志固定复用 `%TEMP%/goodgood-local-services/current-{web,worker,vite}.{out,err}.log`。

checkpoint 构建会清空 dist 中忽略的启动器。构建后从 scripts 对应原脚本仅适配 `./local-*` 导入到 `../scripts/local-*`、允许旧本机`56449/0`配置并将有效REDIS_URL统一为现有`56549/0`（不能只替换断言），每种入口只保留一个副本；不能把适配器或环境文件纳入提交。

**当前本机有已保存的云参考图，Web 启动不可遗漏云配置。**在 GG-116 目录启动所需 Web；若Worker停止，核对GG-116当前构建/队列后在同一目录启动唯一Worker，两个角色使用原仓库外配置：

~~~powershell
$taskCloudEnvironment = Join-Path $env:LOCALAPPDATA 'GoodGood/local-cloud-upload/cloud-upload.env'
node dist/local-checkpoint-portfix.mjs start workspace --cloud-env-file "$taskCloudEnvironment"
~~~

核对角色 banner 的 `referenceStorage=cloud-development`；readiness 200 只覆盖基础依赖，仍须只读核对现有云参考图预览。缺少配置时保留数据并恢复原文件，禁止重传、改对象键或回退假图片。

并行任务必须按 [WORKFLOW](WORKFLOW.md) 先登记再创建。子 worktree 默认不重复安装依赖或执行完整构建；根 agent 完成集成验证后，退役所有已整合的干净目录，并逐项记录不能删除的 dirty worktree。禁止以文件系统强删代替 `git worktree remove`。

本地开发凭据只从仓库外文件读取，禁止写入仓库或聊天。生产数据库、R2、队列、密钥和用户数据不得进入本地。不要运行旧转换脚本重置现有数据。

## 生产边界

生产仍是 [CURRENT_STATE](CURRENT_STATE.md) 记录的 GG-098 应用和 GG-100 单槽 `goodgood-production` Compose。GG-239 之后的任务是本地代码/流程检查点，没有 CI 不可变镜像、生产预检或部署授权。未来发布只能按 ADR 0091 的单槽策略原地替换，不恢复历史 blue/green、双 Compose 项目或 Nginx upstream 切换。

## 下一步

用户刷新5173手动测试文本生成、可编辑结果/停止/保存与每次20积分；构建及本地0061/Web已启用，实际提供商响应/视觉效果尚未验收。后续仍默认仅开发代码，不自动编译/代码检查；GG-294辅助目录已退役。免费政策待用户明确后再开发quota/升级Web与Worker，新需求以当前HEAD核对祖先，生产另获授权。
