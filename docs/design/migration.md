# 迁移对照

现有代码（`app/globals.css`）已有 token，但大部分样式写的是字面量。按页面逐块替换，每次只改一个区域。

## 颜色

| 旧值 | 换成 |
| --- | --- |
| `#18181b`、`#27272a`、`#111`、`#242424`、`#17171d` | `ink` |
| `#3f3f46`、`#52525b`、`#55555f`、`#595959`、`#5f5f69`、`#62626c` | `muted` |
| `#71717a`、`#6f6f7b`、`#6c6c77`、`#74747e`、`#777781` | 白底 `quiet`，灰底 `muted` |
| `#a1a1aa`、`#aaaab4` | `quiet`（原值对比度不足） |
| `#e4e4e7`、`#dedee2`、`#dedee4`、`#e0e0e5`、`#ededf0` | `line` |
| `#f4f4f5`、`#f1f1f2`、`#f3f3f5`、`#f0f0f3`、`#eeeef1` | `soft` |
| `#e9e9ec`、`#e8e8ec`、`#ececee` | `fill-hover` |
| `#fafafa`、`#fafafb`、`#f8f8fa` | `canvas` 或 `soft` |
| `#fff`、`#ffffff` | `white`（表面）或 `canvas`（地面） |

侧栏导航文字 `#6f6f7b` 直接改为 `ink`。

## 圆角

| 旧值 | 换成 |
| --- | --- |
| 2–4px | 只留给缩略图内标记 |
| 5–9px | `radius-sm` |
| 10px（菜单内元素） | `radius-item` |
| 11–15px | `radius-md` |
| 16–18px | `radius-lg`；菜单为 `radius-popover` |
| 20–28px | `radius-xl`，只用于输入面板 |
| 999px、50% | `radius-pill` / 圆形 |

## 字号与字重

| 旧值 | 换成 |
| --- | --- |
| 7–10px | `micro`（仅画布） |
| 13px | 按钮与菜单 `label`；导航 `nav`；说明 `caption` |
| 15px | 输入 `prompt`，其他 `body` |
| 16px | `subheading` |
| 17–24px | `heading`；首页标题 `display` |
| 520–560 | 500 |
| 620–720 | 600 |

## 其他

- 73 种 `box-shadow` 并入 `shadow-xs/sm/md/lg` 或 `none`。
- 过渡时长统一 160ms，预览出现 180ms。
- `body` 改用 `sans` 字族，删除局部 `font-family`；安装 `@fontsource-variable/inter` 并在入口引入。
- CSS 写 `var(--ink)`；TSX 用对应 Tailwind 类。不写十六进制、任意圆角、任意字号（包括 `text-[11px]`）。
- 需要新值时先加 token，再使用。
