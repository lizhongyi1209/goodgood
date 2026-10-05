export function canvasVideoStoryboardShots(shots, connectedText = "") {
  const context = connectedText.trim();
  return shots.map((shot, index) => ({ seconds: shot.seconds,
    text: [index === 0 ? context : "", shot.text.trim()].filter(Boolean).join("\n\n") }));
}

export function canvasVideoStoryboardProblem(shots, duration, connectedText = "") {
  if (!shots.length || shots.length > 6) return "请设置 1–6 个镜头。";
  if (shots.some((shot) => !Number.isInteger(shot.seconds) || shot.seconds < 1 || shot.seconds > 15)) return "每个镜头至少 1 秒，请使用整数。";
  if (shots.reduce((total, shot) => total + shot.seconds, 0) !== duration) return `镜头时长合计需要等于 ${duration} 秒。`;
  const effective = canvasVideoStoryboardShots(shots, connectedText);
  const empty = effective.findIndex((shot) => !shot.text);
  if (empty >= 0) return `请填写镜头 ${empty + 1} 的描述。`;
  const long = effective.findIndex((shot) => shot.text.length > 512);
  if (long >= 0) return `镜头 ${long + 1} 的描述最多 512 个字符${long === 0 && connectedText.trim() ? "，包括连接文本" : ""}。`;
  if (effective.map((shot, index) => `shot ${index + 1}, ${shot.seconds}s, ${shot.text}`).join("; ").length > 3072) return "分镜总描述过长，请精简后重试。";
  return null;
}
