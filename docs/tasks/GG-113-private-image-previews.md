# GG-113 — private image previews for cards and selectors

- Status: code and local tests verified; runtime switch pending; not deployed.
- Baseline: GG-112 `85eea1a`; branch `feature/GG-113-private-image-previews`;
  worktree `F:/goodgood-worktrees/GG-113`.
- Decision: [ADR 0101](../decisions/0101-private-card-image-previews.md).

## Scope and acceptance

The operator selected all asset library image cards and selectors. The image
asset grid, generated-image cards, project/profile covers sourced from generated
assets, reference material cards, creation and inspiration pickers, and sticker
picker display 512 px WebP previews. Large focused image views and explicit
downloads retain the original. Selection still supplies originals where model
input or editing needs them. Reference uploads and existing objects remain
unchanged. No production OSS style, migration, or new stored object is needed.

Preview access must check the current owner/workspace before serving bytes or
redirecting to a short-lived signed OSS transform. Local legacy references and
generated assets use streamed Sharp conversion. Failed processing must not
silently load the full original in a card. Empty libraries remain empty.
Library JSON must not contain a signed original; the owner-checked original
route is fetched only for an explicit full image, edit, or download action.

## Verification and handoff

- Read-only OSS probe through the GG-113 signer on an existing
  `local-dev/references/` test object: 2,380,052-byte source → 30,556-byte
  288 × 512 WebP; HTTP 200.
- Read-only RustFS probe through GG-113 streamed Sharp conversion on an
  existing generated asset: 684,367-byte source → 27,844-byte 512 × 512 WebP.
- Targeted route, signature, presentation, Sharp, and documentation tests pass.
  `npm run check:local`: 589 tests, 563 passed, 26 isolated skips, 0 failed;
  lint has 16 existing warnings and no errors.
- Checkpoint build, local HTTP verification, and exact final revision are pending.
- Keep GG-112 5173/32131 services running until GG-113 can replace them from
  a verified committed checkpoint; leave the real-provider Worker stopped.

## 下一步

Finish the full local gate, commit the exact checkpoint, and verify 5173/32131
serve the new preview routes without changing production objects.
