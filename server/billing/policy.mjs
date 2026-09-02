export const CREDIT_LEDGER_ENTRY_TYPES = Object.freeze([
  "grant",
  "reserve",
  "settle",
  "release",
  "refund",
  "expire",
  "adjust",
]);

function toBigInt(value, fieldName) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  throw new TypeError(`${fieldName} must be an exact integer.`);
}

export function exactCreditAmount(value, fieldName = "amount") {
  return toBigInt(value, fieldName);
}

export function positiveCreditAmount(value, fieldName = "amount") {
  const amount = toBigInt(value, fieldName);
  if (amount <= 0n) throw new RangeError(`${fieldName} must be positive.`);
  return amount;
}

export function creditBalanceDeltas(entryType, value) {
  if (!CREDIT_LEDGER_ENTRY_TYPES.includes(entryType)) {
    throw new TypeError(`Unsupported credit ledger entry type: ${entryType}`);
  }
  const amount = toBigInt(value, "signed amount");
  if (amount === 0n) throw new RangeError("Credit ledger amount cannot be zero.");

  if (["grant", "release", "refund"].includes(entryType) && amount < 0n) {
    throw new RangeError(`${entryType} requires a positive signed amount.`);
  }
  if (["reserve", "settle", "expire"].includes(entryType) && amount > 0n) {
    throw new RangeError(`${entryType} requires a negative signed amount.`);
  }

  switch (entryType) {
    case "reserve":
      return { available: amount, reserved: -amount };
    case "settle":
      return { available: 0n, reserved: amount };
    case "release":
      return { available: amount, reserved: -amount };
    default:
      return { available: amount, reserved: 0n };
  }
}

export function projectCreditBalance(account, entryType, amount) {
  const available = toBigInt(account.available, "available balance");
  const reserved = toBigInt(account.reserved, "reserved balance");
  const deltas = creditBalanceDeltas(entryType, amount);
  const projected = {
    available: available + deltas.available,
    reserved: reserved + deltas.reserved,
  };
  if (projected.available < 0n || projected.reserved < 0n) {
    return null;
  }
  return projected;
}
