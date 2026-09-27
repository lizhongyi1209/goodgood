/**
 * @typedef {import("./canvas-workspace").CanvasNode} CanvasNode
 * @param {CanvasNode[]} current
 * @param {string} runKey
 * @param {import("@/shared/contracts/generation").GenerationJob} job
 * @param {{x: number, y: number}} origin
 * @param {() => void} onRetry
 * @returns {CanvasNode[]}
 */
export function upsertCanvasJobNodes(current, runKey, job, origin, onRetry) {
  const count = job.state === "failed" || job.state === "cancelled" ? 1 : job.input.count;
  const prefix = `canvas-${runKey}-`;
  const firstPosition = current.find((node) => node.id === `${prefix}0`)?.position ?? origin;
  const retained = current.filter((node) => !node.id.startsWith(prefix));
  const updated = Array.from({ length: count }, (_, index) => {
    const id = `${prefix}${index}`;
    const previous = current.find((node) => node.id === id);
    const sameOutput = previous?.data?.job?.outputs?.[index]?.id === job.outputs[index]?.id && Boolean(job.outputs[index]);
    return {
      id,
      type: "imageResult",
      position: previous?.position ?? { x: firstPosition.x + index * 254, y: firstPosition.y },
      ...(previous?.selected ? { selected: true } : {}),
      ...(sameOutput && previous?.data.imageSized
        ? { width: previous.width, height: previous.height }
        : {}),
      data: { job, index, onRetry, imageSized: sameOutput && previous?.data.imageSized },
    };
  });
  return [...retained, ...updated];
}
