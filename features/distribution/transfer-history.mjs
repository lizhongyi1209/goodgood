/**
 * Filter only fetched pages; callers must keep pagination/range disclosure.
 * @param {readonly import("../../shared/contracts/distribution").CreditTransferSummary[]} items
 * @param {string | null | undefined} counterpartyId
 */
export function transfersForCounterparty(items, counterpartyId) {
  return counterpartyId ? items.filter((item) => item.counterpartyId === counterpartyId) : items;
}
