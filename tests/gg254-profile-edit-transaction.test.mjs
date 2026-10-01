import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { commitProfileEdit } from "../features/profile/profile-edit-transaction.mjs";
import { formatPublicUserId, profileDisplayName } from "../shared/profile-policy.mjs";

const profile = { displayName: "原用户名", publicUserId: "000254", avatarReferenceId: "saved-avatar", avatarUrl: "https://private.invalid/avatar", version: 7 };
const file = { name: "avatar.png", type: "image/png", size: 100 };
const neverUpload = async () => { assert.fail("username edit must not upload"); };

test("GG-254 confirmed username preserves avatar/version and validates before issuing a write", async () => {
  let writes = 0;
  const result = await commitProfileEdit({ profile, kind: "name", name: "  mimi😀  ", uploadAvatar: neverUpload, save: async (value) => { writes++; assert.deepEqual(value, { displayName: "mimi😀", avatarReferenceId: "saved-avatar", version: 7 }); return { ...profile, ...value, version: 8 }; } });
  assert.equal(result.displayName, "mimi😀"); assert.equal(writes, 1);
  for (const name of ["", "a".repeat(31), "a\nb", "a\u202eb"]) await assert.rejects(commitProfileEdit({ profile, kind: "name", name, uploadAvatar: neverUpload, save: async () => { assert.fail("invalid input must not save"); } }), /用户名/);
});

test("GG-254 cancelled confirmation does not upload or patch; a late cancelled upload never binds a profile", async () => {
  const alreadyCancelled = new AbortController(); alreadyCancelled.abort();
  await assert.rejects(commitProfileEdit({ profile, kind: "avatar", file, signal: alreadyCancelled.signal, uploadAvatar: async () => { assert.fail("cancelled draft must not upload"); }, save: async () => { assert.fail("cancelled draft must not save"); } }), { name: "AbortError" });
  const pending = new AbortController(); let resolveUpload; let writes = 0;
  const promise = commitProfileEdit({ profile, kind: "avatar", file, signal: pending.signal, uploadAvatar: () => new Promise(resolve => { resolveUpload = resolve; }), save: async () => { writes++; return profile; } });
  pending.abort(); resolveUpload({ id: "new-avatar" });
  await assert.rejects(promise, { name: "AbortError" }); assert.equal(writes, 0);
});

test("GG-254 confirmed avatar uploads first and only binds its validated result; remove needs no upload", async () => {
  const order = [];
  await commitProfileEdit({ profile, kind: "avatar", file, uploadAvatar: async (received) => { assert.equal(received, file); order.push("upload"); return { id: "new-avatar" }; }, save: async (value) => { order.push("save"); assert.deepEqual(value, { displayName: profile.displayName, avatarReferenceId: "new-avatar", version: 7 }); return profile; } });
  assert.deepEqual(order, ["upload", "save"]);
  await commitProfileEdit({ profile, kind: "avatar", removeAvatar: true, uploadAvatar: neverUpload, save: async (value) => { assert.equal(value.avatarReferenceId, null); return profile; } });
});

test("GG-254 upload/save failures propagate without losing the caller's draft or attempting a fallback write", async () => {
  await assert.rejects(commitProfileEdit({ profile, kind: "avatar", file, uploadAvatar: async () => { throw new Error("上传失败"); }, save: async () => { assert.fail("failed upload must not save"); } }), /上传失败/);
  await assert.rejects(commitProfileEdit({ profile, kind: "name", name: "mimi", uploadAvatar: neverUpload, save: async () => { throw new Error("资料已在其他页面更新"); } }), /其他页面/);
  assert.equal(profile.displayName, "原用户名"); assert.equal(profile.version, 7);
});

test("GG-254 display defaults keep custom names; every public ID boundary is six decimal digits including zero", () => {
  assert.equal(profileDisplayName(null), "mimi"); assert.equal(profileDisplayName("GoodGood 用户"), "mimi"); assert.equal(profileDisplayName("自定义😀"), "自定义😀");
  assert.equal(formatPublicUserId(0), "000000"); assert.equal(formatPublicUserId(999999), "999999");
  for (const value of [-1, 1000000, 1.2, null, undefined, "123456", "00000000-0000-4000-8000-000000000001"]) assert.equal(formatPublicUserId(value), null);
});

test("GG-254 UI uses contenteditable with local confirm, outside-cancel, IME/keyboard rules and no homepage", async () => {
  const view = await readFile(new URL("../features/profile/personal-information.tsx", import.meta.url), "utf8");
  const dialog = await readFile(new URL("../features/billing/credit-usage-dialog.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(view, /role="textbox" contentEditable=\{!busy\}/);
  assert.match(view, /确认保存用户名/); assert.match(view, /确认保存头像/);
  assert.match(view, /addEventListener\("pointerdown", outside, true\)/); assert.match(view, /addEventListener\("focusin", outside, true\)/);
  assert.match(view, /event\.nativeEvent\.isComposing/); assert.match(view, /event\.key === "Escape"/);
  assert.match(view, /URL\.createObjectURL\(fileValue\)/); assert.match(view, /requestRef\.current\?\.abort\(\)/);
  assert.match(view, /1–30 个字符/); assert.match(view, /最大 2 MB/);
  assert.doesNotMatch(view, /<Input|<footer|type="submit"|handle:|session\?\.user\.id \?\? "暂不可用"/);
  assert.doesNotMatch(dialog, /个人主页|onProfileClick/); assert.match(dialog, /disabled=\{pending\}/);
  assert.doesNotMatch(shell, /PersonalProfileView|handleProfileNav|activeView === "profile"/);
  assert.match(shell, /route\.kind === "profile"[\s\S]*navigateWorkspace\(\{ kind: "create" \}[\s\S]*setCreditUsageOpen\(true\)/);
});
