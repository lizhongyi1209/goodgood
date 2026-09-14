export const JCOIN_ATOMS = 100_000_000n;
export const JCOIN_START = '2026-09-17T16:00:00.000Z';
/** @param {bigint | string} value */
export function formatJcoinAtoms(value) {
  const amount = BigInt(value), absolute = amount < 0n ? -amount : amount;
  const fraction = (absolute % JCOIN_ATOMS).toString().padStart(8, '0').replace(/0+$/, '');
  return `${amount < 0n ? '-' : ''}${absolute / JCOIN_ATOMS}${fraction ? `.${fraction}` : ''}`;
}
/** @param {string} unit @param {bigint | string} amount */
export function normalizedPaidCredits(unit, amount) {
  if (!['credit', 'credit-cny-cent'].includes(unit)) return null;
  const paid = BigInt(amount);
  return (paid < 0n ? -paid : paid) * (unit === 'credit' ? 2n : 1n);
}
/** @param {bigint} credits @param {bigint} rate @param {bigint} remaining */
export function cappedJcoinReward(credits, rate, remaining) {
  const calculated = credits * rate;
  return calculated < remaining ? calculated : remaining;
}
