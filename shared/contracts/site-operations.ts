export type OperationsKind = "tasks" | "credits";
export type OperationsJob = {
  id: string; batchId: string; createdAt: string; completedAt: string | null;
  state: string; email: string; fund: string; fundName: string | null;
  model: string; resolution: string; aspectRatio: string; count: number;
  line: string | null; quality: string | null; quote: string | null; errorCode: string | null;
};
export type OperationsCredit = {
  id: string; createdAt: string; type: string; credits: string; email: string | null;
  fund: string; fundName: string | null; jobId: string | null; priorId: string | null;
};
export type OperationsDay = {
  day: string; peak: string | null; creators: string; succeeded: string; failed: string;
  cancelled: string; users: string; settled: string; refunded: string; released: string;
  rechargeAmountMinor: string; rechargeOrders: string; rechargeUsers: string; rechargeCredits: string;
};
export type OperationsDashboard = { days: OperationsDay[]; concurrent: string; queued: string; measuredAt: string };
export type OperationsLog = { items: (OperationsJob | OperationsCredit)[]; nextCursor: string | null };
export type OperationsDetail = { job: OperationsJob | null; selected: OperationsCredit | null; timeline: OperationsCredit[] };
