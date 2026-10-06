/** Allocate whole seconds without dropping scene text or changing the input array. */
export function canvasVideoStoryboardResize(shots, seconds) {
  if (!shots.length) return [];
  const total = Math.max(shots.length, Math.min(15, Math.round(seconds)));
  const remaining = total - shots.length;
  const weights = shots.map((shot) => Math.max(0, shot.seconds - 1));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const shares = weights.map((weight) => remaining * (weightSum ? weight / weightSum : 1 / shots.length));
  const allocated = shares.map(Math.floor);
  const order = shares.map((share, index) => ({ index, fraction: share - allocated[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const extra = remaining - allocated.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < extra; index++) allocated[order[index].index] += 1;
  return shots.map((shot, index) => ({ ...shot, seconds: allocated[index] + 1 }));
}

export function canvasVideoStoryboardSceneSeconds(shots, index, seconds, duration) {
  if (shots.length < 2 || !shots[index]) return [...shots];
  const value = Math.max(1, Math.min(duration - shots.length + 1, Math.round(seconds)));
  const others = canvasVideoStoryboardResize(shots.filter((_, position) => position !== index), duration - value);
  let other = 0;
  return shots.map((shot, position) => position === index ? { ...shot, seconds: value } : others[other++]);
}

// Reference vocabulary from https://kling.ai/quickstart/ai-camera-control-guide.
// Omni receives these as editable prompt text, never as a camera_control parameter.
export const CANVAS_VIDEO_CAMERA_REFERENCES = [
  { id: "horizontal", name: "水平移动", text: "运镜：单镜头连续拍摄，镜头缓慢水平移动。" },
  { id: "vertical", name: "垂直移动", text: "运镜：单镜头连续拍摄，镜头缓慢垂直移动。" },
  { id: "zoom-in", name: "变焦拉近", text: "运镜：单镜头连续拍摄，镜头缓慢变焦拉近。" },
  { id: "zoom-out", name: "变焦拉远", text: "运镜：单镜头连续拍摄，镜头缓慢变焦拉远。" },
  { id: "pan", name: "水平摇摄", text: "运镜：单镜头连续拍摄，机位固定，镜头缓慢水平摇摄。" },
  { id: "tilt", name: "俯仰镜头", text: "运镜：单镜头连续拍摄，机位固定，镜头缓慢俯仰。" },
  { id: "roll", name: "旋转镜头", text: "运镜：单镜头连续拍摄，镜头围绕光轴缓慢旋转。" },
];

/** Remove only our exact reference line when selecting another shot mode. */
export function canvasVideoCameraDescription(prompt) {
  const existing = new Set(CANVAS_VIDEO_CAMERA_REFERENCES.map((item) => item.text));
  return prompt.split(/\r?\n/).filter((line) => !existing.has(line.trim())).join("\n").trim();
}

/** Replace only our exact reference line, preserving the user's remaining prompt. */
export function canvasVideoCameraPrompt(prompt, referenceId, connectedText = "") {
  const reference = CANVAS_VIDEO_CAMERA_REFERENCES.find((item) => item.id === referenceId);
  if (!reference) return null;
  const description = canvasVideoCameraDescription(prompt);
  const next = [description, reference.text].filter(Boolean).join("\n\n");
  return [connectedText.trim(), next].filter(Boolean).join("\n\n").length <= 3072 ? next : null;
}

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
