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

function paymentFundedBalanceDeltas(entryType, value) {
  const amount = toBigInt(value, "payment-funded amount");
  if (amount === 0n) return { available: 0n, reserved: 0n };
  return creditBalanceDeltas(entryType, amount);
}

export function paymentFundedPortionForReservation(account, value) {
  const amount = toBigInt(value, "reservation amount");
  const available = toBigInt(account.available, "available balance");
  const paymentFundedAvailable = toBigInt(
    account.paymentFundedAvailable,
    "payment-funded available balance",
  );
  if (
    amount <= 0n ||
    available < 0n ||
    paymentFundedAvailable < 0n ||
    paymentFundedAvailable > available ||
    amount > available
  ) {
    return null;
  }
  const nonTransferableAvailable = available - paymentFundedAvailable;
  return amount > nonTransferableAvailable
    ? amount - nonTransferableAvailable
    : 0n;
}

export function projectSourceAwareCreditBalance(
  account,
  entryType,
  amount,
  paymentFundedAmount,
) {
  const signedAmount = toBigInt(amount, "signed amount");
  const signedPaymentFundedAmount = toBigInt(
    paymentFundedAmount,
    "payment-funded amount",
  );
  if (
    (signedAmount > 0n &&
      (signedPaymentFundedAmount < 0n ||
        signedPaymentFundedAmount > signedAmount)) ||
    (signedAmount < 0n &&
      (signedPaymentFundedAmount > 0n ||
        signedPaymentFundedAmount < signedAmount))
  ) {
    throw new RangeError(
      "payment-funded amount must share the entry sign and stay within its magnitude.",
    );
  }

  const aggregate = projectCreditBalance(account, entryType, signedAmount);
  if (!aggregate) return null;
  const paymentFundedAvailable = toBigInt(
    account.paymentFundedAvailable,
    "payment-funded available balance",
  );
  const paymentFundedReserved = toBigInt(
    account.paymentFundedReserved,
    "payment-funded reserved balance",
  );
  const deltas = paymentFundedBalanceDeltas(
    entryType,
    signedPaymentFundedAmount,
  );
  const projected = {
    available: aggregate.available,
    paymentFundedAvailable: paymentFundedAvailable + deltas.available,
    paymentFundedReserved: paymentFundedReserved + deltas.reserved,
    reserved: aggregate.reserved,
  };
  if (
    projected.paymentFundedAvailable < 0n ||
    projected.paymentFundedReserved < 0n ||
    projected.paymentFundedAvailable > projected.available ||
    projected.paymentFundedReserved > projected.reserved
  ) {
    return null;
  }
  return projected;
}
