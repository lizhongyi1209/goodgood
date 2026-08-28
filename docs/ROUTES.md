# Navigation and route contract

## Current prototype

The current implementation is one client-side route (`/`) and switches among
views using local `activeView` state in `app/page.tsx`.

| Visible navigation | Current status | Current behavior |
| --- | --- | --- |
| 创作 | Implemented | `activeView = create` |
| 探索 | Placeholder | No view or route yet |
| 项目 | Implemented prototype | `activeView = projects` |
| 资产库 | Implemented prototype | `activeView = assets` |
| 灵感板 | Placeholder | No view or route yet |
| 帮助 | Placeholder | No view or route yet |
| 图片详情 | Implemented overlay | Dialog, not URL-addressable |

Do not describe placeholders as shipped features.

## Target production routes

Adopt these only when real persistence and routing are implemented:

| Route | Purpose |
| --- | --- |
| `/create` | Clean or active creation session |
| `/projects` | Project index |
| `/projects/:projectId` | Restore and continue a project |
| `/assets` | Batch/gallery asset library |
| `/assets/:assetId` | Addressable image detail |
| `/explore` | Future discovery experience |
| `/moodboards` | Future moodboards |
| `/help` | Product help and status guidance |

The root route may redirect to `/create` after authentication is defined.

## Navigation rules

- Navigating between Creation, Projects, and Assets must not silently lose an
  in-progress generation.
- A project detail must expose `新建创作` near project actions.
- Opening image detail should preserve the source scope so its rail matches the
  images the user was browsing.
- Filters, selected mode, and scroll position should survive detail close and
  browser back navigation.
- Future URLs use stable IDs, never model names, prompts, or localized labels.
