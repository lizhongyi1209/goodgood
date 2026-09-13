import type {
  createDistributionTransfer,
  readDistributionChildren,
  readDistributionTransfers,
} from "./http-distribution-boundary";

// Once accepted, a refresh failure must never be presented as a failed transfer.
export async function transferAndRefresh(
  input: Parameters<typeof createDistributionTransfer>[0],
  dependencies: Readonly<{
    create: typeof createDistributionTransfer;
    readChildren: typeof readDistributionChildren;
    readTransfers: typeof readDistributionTransfers;
    onAccepted: (result: Awaited<ReturnType<typeof createDistributionTransfer>>) => void;
  }>,
) {
  const result = await dependencies.create(input);
  dependencies.onAccepted(result);
  try {
    const [children, transfers] = await Promise.all([
      dependencies.readChildren(), dependencies.readTransfers(),
    ]);
    return { children, transfers, refreshError: null };
  } catch {
    return { children: null, transfers: null,
      refreshError: `划拨 ${result.transfer.id} 已完成，列表暂未更新。请刷新记录，不要重复分配。` };
  }
}
