import { VideoGenerationError } from "./errors.mjs";
function boxes(bytes, start = 0, end = bytes.length) {
  const result = []; let offset = start;
  while (offset + 8 <= end) {
    let size = bytes.readUInt32BE(offset); const type = bytes.toString("ascii", offset + 4, offset + 8); let header = 8;
    if (size === 1) { if (offset + 16 > end) break; size = Number(bytes.readBigUInt64BE(offset + 8)); header = 16; }
    if (size === 0) size = end - offset;
    if (!Number.isSafeInteger(size) || size < header || offset + size > end) break;
    result.push({ type, start: offset + header, end: offset + size }); offset += size;
  }
  return result;
}
/** Inspect bounded MP4 metadata without decoding frames or invoking a process. */
export function readMp4Metadata(bytes, { allowMov = false } = {}) {
  const bad = () => { throw new VideoGenerationError("VIDEO_CONTENT_INVALID", "无法读取视频尺寸和时长，请使用完整的 MP4 视频。", 409); };
  if (!Buffer.isBuffer(bytes) || bytes.length < 32 || bytes.toString("ascii", 4, 8) !== "ftyp" || !allowMov && bytes.toString("ascii", 8, 12) === "qt  ") bad();
  const moov = boxes(bytes).find((box) => box.type === "moov"); if (!moov) bad();
  for (const track of boxes(bytes, moov.start, moov.end).filter((box) => box.type === "trak")) {
    const children = boxes(bytes, track.start, track.end);
    const tkhd = children.find((box) => box.type === "tkhd"); const mdia = children.find((box) => box.type === "mdia"); if (!tkhd || !mdia) continue;
    const headers = boxes(bytes, mdia.start, mdia.end); const hdlr = headers.find((box) => box.type === "hdlr"); const mdhd = headers.find((box) => box.type === "mdhd");
    if (!hdlr || hdlr.start + 12 > hdlr.end || bytes.toString("ascii", hdlr.start + 8, hdlr.start + 12) !== "vide" || !mdhd) continue;
    const version = bytes[mdhd.start]; const timeOffset = mdhd.start + (version === 1 ? 20 : 12);
    if (timeOffset + (version === 1 ? 12 : 8) > mdhd.end || tkhd.end - tkhd.start < 84) continue;
    const scale = bytes.readUInt32BE(timeOffset); const duration = version === 1 ? Number(bytes.readBigUInt64BE(timeOffset + 4)) : bytes.readUInt32BE(timeOffset + 4);
    let pixelWidth = Math.round(bytes.readUInt32BE(tkhd.end - 8) / 65536); let pixelHeight = Math.round(bytes.readUInt32BE(tkhd.end - 4) / 65536);
    // Track matrices store orientation independently of encoded dimensions.
    const matrix = tkhd.start + (bytes[tkhd.start] === 1 ? 52 : 40);
    if (matrix + 36 <= tkhd.end && bytes.readInt32BE(matrix) === 0 && Math.abs(bytes.readInt32BE(matrix + 4)) === 65536) [pixelWidth, pixelHeight] = [pixelHeight, pixelWidth];
    const durationSeconds = duration / scale;
    if (!pixelWidth || !pixelHeight || !scale || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 3600) bad();
    const minf = headers.find((box) => box.type === "minf");
    const stbl = minf && boxes(bytes, minf.start, minf.end).find((box) => box.type === "stbl");
    const stts = stbl && boxes(bytes, stbl.start, stbl.end).find((box) => box.type === "stts");
    let frameRate = null;
    if (stts && stts.start + 8 <= stts.end) {
      const entries = bytes.readUInt32BE(stts.start + 4);
      if (entries > 100_000 || stts.start + 8 + entries * 8 > stts.end) bad();
      let samples = 0; let ticks = 0;
      for (let index = 0; index < entries; index += 1) {
        const offset = stts.start + 8 + index * 8;
        const count = bytes.readUInt32BE(offset); const delta = bytes.readUInt32BE(offset + 4);
        samples += count; ticks += count * delta;
      }
      if (Number.isSafeInteger(samples) && Number.isSafeInteger(ticks) && samples > 0 && ticks > 0) frameRate = samples * scale / ticks;
    }
    return { pixelWidth, pixelHeight, durationSeconds, ...(frameRate ? { frameRate } : {}) };
  }
  bad();
}
