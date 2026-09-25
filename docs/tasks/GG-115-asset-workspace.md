# GG-115 — Asset history and personal library

- Status: local implementation and authenticated asset-page acceptance complete; not deployed.
- Baseline: GG-114 `3665087`; branch `feature/GG-115-asset-workspace`;
  worktree `F:/goodgood-worktrees/GG-115`.
- Decision: [ADR 0102](../decisions/0102-asset-history-library-and-upload.md).

## Scope and acceptance

Default `/assets` to generation history grouped by date, with all/image/video/
audio counters and truthful empty states. Personal library includes generated
and accepted uploaded media automatically; create and open folders, move items,
search/filter, and edit optional tags without duplicating objects. Add a
GoodGood-styled asset upload dialog with folder/tag choice, supported format and
20 MiB validation, per-file progress/failure recovery, and upload-to-library
refresh. Reuse existing private image/video pipelines and introduce durable MP3
storage and playback. The composer and other upload entry points use the same
20 MiB ceiling for new files. Keep old files readable, projects independent,
owner/workspace isolation, private previews, original detail, and refresh/back
navigation.

## Implementation

- `features/assets/asset-workspace.tsx` provides history, filters, folders,
  search, tags, private media cards, and a Radix upload dialog. Generated
  outputs enter the library through the existing asset IDs.
- Migration `0046` adds organization and audio material tables. Authenticated
  Node and Next routes enforce owner/workspace checks. MP3 uses signed direct
  PUT, post-upload size/type/header validation, private reads, and dry-run-first
  cleanup shared with video.
- Shared new-upload contracts require at most 20 MiB and JPEG/PNG/MP4/MP3.
  Image editing exports PNG. Existing objects are not rewritten.

## Verification and handoff

- Targeted GG-115 and GG-104 tests: 8/8 pass.
- `npm run check:local`: 592 tests, 566 pass, 26 isolated skips, 0 fail;
  lint/typecheck/build pass (16 existing lint warnings).
- Local database confirmed on `127.0.0.1:54449/goodgood`, Worker 32142 off;
  migration `0046` applied transactionally and verified 45→46 entries.
- Commit `eb751eb` built and verified as the exact checkpoint. 5173 Vite and
  32131 Web now serve GG-115: `/assets`, readiness, and proxied version return
  200; unauthenticated organization/audio routes return 401. Worker 32142
  stays off. Production remains unchanged.
- After the `d292126` documentation checkpoint, the owner confirmed on 5173
  that generation history opens by default, personal library switches normally,
  and a test JPG/PNG remains visible and previewable after upload and refresh.
  Folder organization and MP3/MP4 browser uploads were not separately exercised
  in that acceptance; their routes/contracts have automated coverage.

## 2026-09-25 本地服务重新启动（无代码改动）

要求「继续 GG-115 并启动服务」，未改代码；只重建本地依赖容器并重启三个角色。

- 依赖容器 `goodgood-gg052-object-storage-1` 的 58049/58050 主机端口在
  Docker Desktop 重启后没有恢复，容器内部 9000 仍正常。根因是 Windows 保留
  区间 TCP `58026-58125`（`netsh int ipv4 show excludedportrange`），旧容器
  因为持有得早而没被抢走端口。站长提权执行 `net stop winnat` / `net start
  winnat` 重置后，用该 Compose 项目（`F:\goodgood-worktrees\GG-071`
  compose.yaml）以 `GOODGOOD_OBJECT_STORAGE_PORT=58049`、
  `..._CONSOLE_PORT=58050`、`up --detach --no-deps --force-recreate
  object-storage` 重建；`goodgood-gg052_object-storage-data` 卷保留，其他容器、
  迁移和既有对象未动。仅重建期间该容器短暂不可用。
- `check:local` 的测试会触发构建并覆盖 `dist/`，删掉 `dist/goodgood-build.json`，
  随后 `verify:checkpoint` 报 “No valid build provenance”。这不是源码问题；
  工作树干净时重新 `build:checkpoint` 即可。新记录 revision `4a899b8…`、
  artifactHash `ed2fdcee…`、259 个产物，`build.verified=true`。
- GG-115 工作树只带 workspace 用的 `.env.login-review`；`start worker` 读
  `.env.local-review`，该文件原本只在 `F:/goodgood` 根目录。已按交接文档做法把
  这份忽略文件复制进本工作树。`start` 仍断言依赖为 54449/56449/58049。
- 本次站长授权范围含真实 Worker。当前运行：32131 Web（PID 29976，
  `build.verified=true`，provider `o1key`、`cloud-development`、`real-smtp`）、
  32142 Worker（PID 2620，`/health/ready` 200，**真实 O1Key，每次生成真实计费**）、
  5173 Vite（代理到 32131）。未提交任何生成任务，未改生产。
- 复跑 `npm run check:local`：592 项、566 通过、26 隔离跳过、0 失败。

## 下一步

Local GG-115 scope is accepted. Future production deployment is a separate
authorized task; keep 5173/32131/32142 running for the next local feature.
