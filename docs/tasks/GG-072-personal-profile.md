# GG-072: 个人资料与自己的图片作品

- Status: Implemented and locally verified; not deployed
- Branch: feature/GG-072-personal-profile
- Worktree: F:/goodgood-worktrees/GG-072
- Baseline: verified main bab17fd + fast-forward GG-071 839f89d
- Decision: [ADR 0075](../decisions/0075-private-personal-profile.md)

## Scope and acceptance

Private own profile in the existing shell: avatar, name, unique @handle and
newest-first personal generated image gallery. Edit through an accessible Sheet;
durable owner-bound saves with conflict recovery. Reuse validated private uploads
and image detail. Desktop/mobile menu entry and direct refresh. No public profile,
friends or enterprise works. Preserve existing model prices and financial history.

## Current checkpoint

Private profile table/API and same-shell desktop/mobile account entry implemented.
Unique case-normalized handles, optimistic saves and owner/personal/ready avatar
validation reuse the existing private upload lifecycle. Responsive works preserve
decoded ratios and open existing details with profile return. Name/avatar updates
are reflected in the account menu. No public/social endpoints or enterprise works.
Isolated branch inherits the reviewed local candidate; original main untouched.

- Targeted tests14/14 passed; named empty goodgood_gg072_profile_test_20260914
  SQL test1/1 passed with no peer/Worker connections; disposable database removed.
  Covers durable saves/reads, duplicate handles, stale versions, other-user and
  enterprise avatar rejection, suspended access, cleanup pin and avatar removal.
- First gate498 tests476 pass19 skip3 fail: expected latest migration and old
  email-only menu assertion needed the new accepted contract; checkpoint needed
  production/historical host facts. Updated tests/docs and preserved both facts.
  Second npm run check:local passed lint/types/build and498 tests479 pass19 skip.
  Final mobile identity wrapping adjustment passed a third justified gate:
  lint/types/production build and498 tests479 pass19 skip0 failures.
- Preview migration0035 added only an empty profile table. Existing migration0029
  byte checksum differs in this inherited Windows checkout; stopped full replay
  and applied only0035 through the normal runner in an ignored scoped directory.
  No old SQL/checksum reset or conversion; all prior migration records verified.
- Original38 non-model/non-migration tables and all managed_models/model events
  unchanged. personal_profiles remains empty so owner chooses their actual details.
  Browser reads, validation and cancel performed without profile/upload writes.
- Desktop/direct refresh/profile1 image/detail close pass. 390px menu retains
  profile/logout; editor390px and no document overflow, Escape/cancel supported.
  Final wrapping verified: identity282px beside72px avatar, edit button next row;
  page width390px without overflow. Desktop restored and account entry confirmed.
  Original GG071 Web39107 and GG072 previews89842/62932 stopped;
  final Web1813/Worker56279 now GG072, mock91616 retained; loopback32141/32142/32143.
  User tab1648145248 marked deliverable at /profile with original owner session.

## Verification and 下一步

下一步：user edits actual name/@handle/avatar at http://127.0.0.1:32141/profile.
Task changes saved in a local commit; no production changes, main merge, push
or paid provider requests authorized. Avatar upload/save proven via existing
upload coverage and isolated profile SQL; real owner avatar was not overwritten.
