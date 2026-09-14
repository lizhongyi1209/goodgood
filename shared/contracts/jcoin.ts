export type JcoinItem = Readonly<{ id: string; kind: 'mining_reward' | 'refund_reversal'; amount: string; consumptionCredits: string | null; occurredAt: string }>;
export type JcoinPage = Readonly<{ balance: string; earned: string; reversed: string; todayEarned: string; items: readonly JcoinItem[]; nextCursor: string | null }>;
export type JcoinBatch = Readonly<{ number: number; status: 'draft' | 'active' | 'paused' | 'exhausted'; budget: string; issued: string; remaining: string; recovered: string; rewardPer100Credits: string; startsAt: string; activatedAt: string | null }>;
export type JcoinPlan = Readonly<{ supply: string; userPool: string; unassigned: string; issued: string; recovered: string; batch: JcoinBatch; measuredAt: string; excludedCount: string; lastProcessedAt: string | null; actions: readonly { id: string; action: string; actorEmail: string; occurredAt: string }[] }>;
export type JcoinAction = 'start' | 'pause' | 'resume' | 'process';
