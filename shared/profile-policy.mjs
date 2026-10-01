export const DEFAULT_PROFILE_NAME = "mimi";
export const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function profileDisplayName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  return !name || name === "GoodGood 用户" ? DEFAULT_PROFILE_NAME : name;
}

export function normalizeProfileName(value) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || Array.from(name).length > 30 || /[\p{Cc}\p{Cf}]/u.test(name)) {
    throw new Error("用户名需为 1–30 个字符，不能包含换行或控制字符。");
  }
  return name;
}

export function formatPublicUserId(value) {
  if (!Number.isInteger(value) || value < 0 || value > 999999) return null;
  return String(value).padStart(6, "0");
}
