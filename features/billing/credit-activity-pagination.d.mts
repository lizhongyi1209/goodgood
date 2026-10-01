import type { CreditActivityFilter } from "@/shared/contracts/billing";
import type { CreditUsageActivityItem, CreditUsageActivityPage } from "./http-billing-boundary";

export const CREDIT_ACTIVITY_PAGE_SIZE: 20;
export type CreditActivityPagerState = Readonly<{
  page: CreditUsageActivityPage | null;
  pageNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading: boolean;
  error: string | null;
}>;
export type CreditActivityPager = Readonly<{
  getState: () => CreditActivityPagerState;
  reset: (filter?: CreditActivityFilter) => Promise<boolean>;
  next: () => Promise<boolean>;
  previous: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  dispose: () => void;
}>;
export function initialCreditActivityState(): CreditActivityPagerState;
export function visibleCreditActivity(item: CreditUsageActivityItem): boolean;
export function createCreditActivityPager(options: Readonly<{
  read: (query: Readonly<{ filter: CreditActivityFilter; cursor: string | null; limit: number; signal: AbortSignal }>) => Promise<CreditUsageActivityPage>;
  onState: (state: CreditActivityPagerState) => void;
}>): CreditActivityPager;
export function creditActivityTaskId(item: CreditUsageActivityItem): string | null;
export function shortenCreditTaskId(taskId: string): string;
export function copyCreditTaskId(taskId: string | null, clipboard?: Pick<Clipboard, "writeText"> | null): Promise<boolean>;
