import { normalizeProfileName } from "../../shared/profile-policy.mjs";

/** One explicitly confirmed edit. A cancelled/expired upload must never PATCH. */
export async function commitProfileEdit({ profile, kind, name, file, removeAvatar = false, uploadAvatar, save, signal }) {
  signal?.throwIfAborted();
  const input = { displayName: normalizeProfileName(kind === "name" ? name : profile.displayName), avatarReferenceId: profile.avatarReferenceId, version: profile.version };
  if (kind === "avatar") {
    if (file) {
      const material = await uploadAvatar(file, signal);
      signal?.throwIfAborted();
      input.avatarReferenceId = material.id;
    } else if (removeAvatar) input.avatarReferenceId = null;
    else throw new Error("请先选择头像。");
  }
  signal?.throwIfAborted();
  const value = await save(input, signal);
  signal?.throwIfAborted();
  return value;
}
