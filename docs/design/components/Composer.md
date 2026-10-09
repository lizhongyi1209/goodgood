# Composer

开始创作与对话的输入面板。

## 规格
- `white`、1px `line`、`radius-xl`、`shadow-md`，内边距 `space-3`。
- 自上而下：素材行（ReferenceThumb）→ 提示词（`prompt`，两行起）→ 底部操作行。
- 首页：宽不超过 `composer-max`，左下 ModeToggle，右下 SendButton。
- 对话页：宽不超过 `chat-max`，左下「+」（打开 AddReferenceMenu）与模型选择，右下发送；回答中变为停止。

## 行为
- Enter 提交，Shift+Enter 换行，输入法组字时不提交。
- 拖入、粘贴图片或链接都会加入素材；拖入时整个面板加 `ink` 描边，显示「松开即可添加」。
- 素材上限：图片模式 10 张；视频模式图片 30、视频 10、音频 10；对话按所选模型。
