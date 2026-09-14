export function normalizeAccountInvitationCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^[0-9]{6}$/.test(code) ? code : null;
}
