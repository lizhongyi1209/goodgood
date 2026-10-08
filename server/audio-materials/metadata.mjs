import { ReferenceRequestError } from "../references/errors.mjs";
const bad = () => { throw new ReferenceRequestError("AUDIO_CONTENT_INVALID", "无法读取音频时长，请使用完整的 WAV 或 MP3 文件。", 409); };
/** Parse bounded PCM WAV or MPEG Layer III frames without spawning a decoder. */
export function readAudioMetadata(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) bad();
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WAVE") {
    let rate = 0; let size = 0; let offset = 12;
    while (offset + 8 <= bytes.length) {
      const type = bytes.toString("ascii", offset, offset + 4); const length = bytes.readUInt32LE(offset + 4); const start = offset + 8;
      if (start + length > bytes.length) bad();
      if (type === "fmt " && length >= 16) {
        if (![1, 3, 65534].includes(bytes.readUInt16LE(start))) bad();
        const channels = bytes.readUInt16LE(start + 2); const sampling = bytes.readUInt32LE(start + 4);
        const align = bytes.readUInt16LE(start + 12); const bits = bytes.readUInt16LE(start + 14);
        rate = bytes.readUInt32LE(start + 8);
        if (channels < 1 || channels > 8 || sampling < 8000 || sampling > 384000 || ![8,16,24,32,64].includes(bits) || align !== channels * bits / 8 || rate !== sampling * align) bad();
      } else if (type === "data") size += length;
      offset = start + length + length % 2;
    }
    if (!rate || !size || size / rate > 3600) bad();
    return { durationSeconds: size / rate, mimeType: "audio/wav" };
  }
  let offset = 0;
  if (bytes.toString("ascii", 0, 3) === "ID3") {
    if (bytes.length < 10 || [6, 7, 8, 9].some((i) => bytes[i] > 127)) bad();
    offset = 10 + (bytes[6] << 21 | bytes[7] << 14 | bytes[8] << 7 | bytes[9]) + (bytes[5] & 16 ? 10 : 0);
  }
  const start = offset; let frames = 0; let seconds = 0;
  while (offset + 4 <= bytes.length) {
    const h = bytes.readUInt32BE(offset); const version = h >>> 19 & 3; const layer = h >>> 17 & 3;
    const bit = h >>> 12 & 15; const sampling = h >>> 10 & 3;
    if ((h >>> 21) !== 2047 || version === 1 || layer !== 1 || !bit || bit === 15 || sampling === 3) {
      if (!frames && offset - start < 65536) { offset++; continue; }
      break;
    }
    const rates = version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
    const frequency = [44100,48000,32000][sampling] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const length = Math.floor((version === 3 ? 144 : 72) * rates[bit] * 1000 / frequency) + (h >>> 9 & 1);
    if (offset + length > bytes.length) bad();
    seconds += (version === 3 ? 1152 : 576) / frequency; frames++; offset += length;
  }
  if (frames < 2 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) bad();
  return { durationSeconds: seconds, mimeType: "audio/mpeg" };
}
