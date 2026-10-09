# ScrollArea

所有可滚动区域。

## 规格
- 6px 悬浮滚动条，`scrollbar` 色，距右 4px；滚动时出现，不占宽度，无轨道。
- 滚动区上下固定的区域保持纯 `white`，不加分隔线和阴影。
- 记录列表：往下翻看时有新生成，顶部出现 Toast 样式的「新的生成已开始」；滚到底自动加载更早的记录。

## 实现
- Radix ScrollArea，`type="scroll"`。
