export type AccountDeletionEvidenceDraft = Readonly<{
  accountEmail: string;
  mailReferenceId: string;
  reason: string;
  verificationConfirmedAt: string;
  verificationRequestedAt: string;
  verifiedEmail: string;
}>;

export type AccountDeletionEvidence = Readonly<{
  mailReferenceId: string;
  reason: string;
  verificationConfirmedAt: string;
  verificationRequestedAt: string;
  verifiedEmail: string;
}>;

export type AccountDeletionEvidenceValidation =
  | Readonly<{ message: string; ok: false }>
  | Readonly<{ ok: true; value: AccountDeletionEvidence }>;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function cleanText(value: string, minimum: number, maximum: number) {
  const text = value.trim();
  return text.length >= minimum &&
    text.length <= maximum &&
    !CONTROL_CHARACTERS.test(text)
    ? text
    : null;
}

export function validateAccountDeletionEvidence(
  draft: AccountDeletionEvidenceDraft,
  now = new Date(),
): AccountDeletionEvidenceValidation {
  const verifiedEmail = draft.verifiedEmail.trim().toLowerCase();
  if (!verifiedEmail) {
    return { message: "请输入已完成往返确认的登记邮箱。", ok: false };
  }
  if (verifiedEmail !== draft.accountEmail.trim().toLowerCase()) {
    return {
      message: "验证邮箱必须与当前账户的登记邮箱完全一致。",
      ok: false,
    };
  }

  const mailReferenceId = cleanText(draft.mailReferenceId, 2, 200);
  if (!mailReferenceId) {
    return { message: "请输入 2 到 200 个字符的邮件服务引用。", ok: false };
  }
  const reason = cleanText(draft.reason, 2, 200);
  if (!reason) {
    return { message: "请输入 2 到 200 个字符的操作原因。", ok: false };
  }

  const requestedAt = new Date(draft.verificationRequestedAt);
  const confirmedAt = new Date(draft.verificationConfirmedAt);
  if (
    !draft.verificationRequestedAt ||
    !draft.verificationConfirmedAt ||
    Number.isNaN(requestedAt.getTime()) ||
    Number.isNaN(confirmedAt.getTime())
  ) {
    return { message: "请填写有效的请求时间和确认时间。", ok: false };
  }
  const duration = confirmedAt.getTime() - requestedAt.getTime();
  if (duration < 0 || duration > 24 * 60 * 60 * 1_000) {
    return {
      message: "账户持有人必须在请求发出后的 24 小时内完成确认。",
      ok: false,
    };
  }
  if (confirmedAt.getTime() > now.getTime() + 5 * 60 * 1_000) {
    return { message: "确认时间不能晚于当前时间。", ok: false };
  }

  return {
    ok: true,
    value: {
      mailReferenceId,
      reason,
      verificationConfirmedAt: confirmedAt.toISOString(),
      verificationRequestedAt: requestedAt.toISOString(),
      verifiedEmail,
    },
  };
}
