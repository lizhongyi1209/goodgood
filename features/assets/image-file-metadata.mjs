// Browser-only JPEG/PNG container editing. Image payload and colour profiles
// stay byte-for-byte intact; camera thumbnail/MakerNote offsets are never copied.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const EXIF = [69, 120, 105, 102, 0, 0];
const XMP = "http://ns.adobe.com/xap/1.0/\0";
const MAX_BYTES = 20 * 1024 * 1024;
const C2PA_STORE_UUID = [0x63, 0x32, 0x70, 0x61, 0x00, 0x11, 0x00, 0x10, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];
const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

export const IMAGE_METADATA_FIELDS = Object.freeze([
  { key: "make", label: "相机品牌", group: "拍摄参数", ifd: "main", tag: 0x010f, type: 2, placeholder: "Canon" },
  { key: "model", label: "相机型号", group: "拍摄参数", ifd: "main", tag: 0x0110, type: 2, placeholder: "EOS R5" },
  { key: "lensMake", label: "镜头品牌", group: "拍摄参数", ifd: "exif", tag: 0xa433, type: 2, placeholder: "Canon" },
  { key: "lensModel", label: "镜头型号", group: "拍摄参数", ifd: "exif", tag: 0xa434, type: 2, placeholder: "RF 50mm F1.2 L USM" },
  { key: "exposureTime", label: "快门（秒）", group: "拍摄参数", ifd: "exif", tag: 0x829a, type: 5, placeholder: "1/125" },
  { key: "fNumber", label: "光圈（f）", group: "拍摄参数", ifd: "exif", tag: 0x829d, type: 5, placeholder: "2.8" },
  { key: "iso", label: "ISO", group: "拍摄参数", ifd: "exif", tag: 0x8827, type: 3, placeholder: "100" },
  { key: "focalLength", label: "焦距（mm）", group: "拍摄参数", ifd: "exif", tag: 0x920a, type: 5, placeholder: "50" },
  { key: "focalLength35mm", label: "等效焦距（mm）", group: "拍摄参数", ifd: "exif", tag: 0xa405, type: 3, placeholder: "50" },
  { key: "exposureBias", label: "曝光补偿（EV）", group: "拍摄参数", ifd: "exif", tag: 0x9204, type: 10, placeholder: "0" },
  { key: "dateTimeOriginal", label: "拍摄时间", group: "拍摄参数", ifd: "exif", tag: 0x9003, type: 2, placeholder: "2026:10:03 12:00:00" },
  { key: "artist", label: "作者", group: "图片信息", ifd: "main", tag: 0x013b, type: 2, placeholder: "作者名称" },
  { key: "copyright", label: "版权", group: "图片信息", ifd: "main", tag: 0x8298, type: 2, placeholder: "版权说明" },
  { key: "description", label: "描述", group: "图片信息", ifd: "main", tag: 0x010e, type: 2, placeholder: "图片描述" },
  { key: "software", label: "软件", group: "图片信息", ifd: "main", tag: 0x0131, type: 2, placeholder: "处理软件" },
  { key: "latitude", label: "纬度", group: "位置信息", placeholder: "-90 至 90，留空不写入" },
  { key: "longitude", label: "经度", group: "位置信息", placeholder: "-180 至 180，留空不写入" },
]);

const begins = (bytes, prefix, offset = 0) => prefix.every((value, index) => bytes[offset + index] === value);
const ascii = (bytes) => String.fromCharCode(...bytes);
const viewOf = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
function join(parts) {
  const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
function requireRange(bytes, offset, size) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > bytes.length) {
    throw new Error("图片元数据已损坏，无法安全处理。请重新选择原图。");
  }
}

function jpegParts(bytes) {
  const parts = [];
  let offset = 2;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) throw new Error("JPEG 文件结构不完整。");
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      parts.push({ marker, start, end: offset, data: new Uint8Array() });
      return parts;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push({ marker, start, end: offset, data: new Uint8Array() });
      continue;
    }
    requireRange(bytes, offset, 2);
    const length = viewOf(bytes).getUint16(offset);
    if (length < 2) throw new Error("JPEG 文件段长度无效。");
    requireRange(bytes, offset, length);
    parts.push({ marker, start, end: offset + length, data: bytes.subarray(offset + 2, offset + length) });
    offset += length;
    if (marker === 0xda) {
      // Keep entropy bytes and restart markers together. Resume parsing between
      // progressive scans so clear also removes metadata after the first SOS.
      const scanStart = offset;
      while (offset < bytes.length) {
        if (bytes[offset] !== 255) { offset++; continue; }
        let next = offset + 1;
        while (bytes[next] === 255) next++;
        if (bytes[next] === 0 || (bytes[next] >= 0xd0 && bytes[next] <= 0xd7)) { offset = next + 1; continue; }
        break;
      }
      if (offset >= bytes.length) throw new Error("JPEG 图像数据不完整。");
      parts.push({ marker: 0, start: scanStart, end: offset, data: bytes.subarray(scanStart, offset) });
    }
  }
  throw new Error("JPEG 文件结构不完整。");
}

function pngParts(bytes) {
  const parts = [];
  let offset = 8;
  while (offset < bytes.length) {
    requireRange(bytes, offset, 12);
    const length = viewOf(bytes).getUint32(offset);
    requireRange(bytes, offset, length + 12);
    const type = ascii(bytes.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error("PNG 文件段类型无效。");
    parts.push({ type, start: offset, end: offset + length + 12, data: bytes.subarray(offset + 8, offset + length + 8) });
    offset += length + 12;
    if (type === "IEND") {
      if (parts[0].type !== "IHDR" || parts[0].data.length !== 13 || !parts.some((part) => part.type === "IDAT") || length !== 0) throw new Error("PNG 图像结构无效。");
      return parts;
    }
  }
  throw new Error("PNG 文件结构不完整。");
}

function container(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_BYTES) throw new Error("请选择 20 MB 以内的 JPEG 或 PNG 原图。");
  if (begins(bytes, [255, 216])) return { format: "jpeg", parts: jpegParts(bytes) };
  if (begins(bytes, PNG)) return { format: "png", parts: pngParts(bytes) };
  throw new Error("当前仅支持 JPEG 和 PNG 图片的元数据。");
}

function readTiff(bytes) {
  requireRange(bytes, 0, 8);
  const little = begins(bytes, [73, 73]);
  if (!little && !begins(bytes, [77, 77])) throw new Error("EXIF 字节序无效。");
  const view = viewOf(bytes);
  const u16 = (offset) => { requireRange(bytes, offset, 2); return view.getUint16(offset, little); };
  const u32 = (offset) => { requireRange(bytes, offset, 4); return view.getUint32(offset, little); };
  if (u16(2) !== 42) throw new Error("EXIF 格式无效。");
  function readIfd(offset) {
    const entries = new Map();
    if (!offset) return entries;
    const count = u16(offset);
    if (count > 1024) throw new Error("EXIF 字段数量过多。");
    requireRange(bytes, offset + 2, count * 12 + 4);
    for (let index = 0; index < count; index++) {
      const at = offset + 2 + index * 12;
      const tag = u16(at), type = u16(at + 2), count = u32(at + 4);
      const size = TYPE_SIZE[type];
      if (!size) continue;
      const length = size * count;
      const start = length <= 4 ? at + 8 : u32(at + 8);
      requireRange(bytes, start, length);
      if (length > 65536) continue;
      const raw = bytes.subarray(start, start + length);
      let value;
      if (type === 2) value = decoder.decode(raw).replace(/\0.*$/s, "");
      else if (type === 1 || type === 7) value = raw;
      else {
        const values = [];
        for (let item = 0; item < count; item++) {
          const position = start + item * size;
          if (type === 3) values.push(u16(position));
          if (type === 4) values.push(u32(position));
          if (type === 9) values.push(view.getInt32(position, little));
          if (type === 5 || type === 10) {
            const numerator = type === 5 ? u32(position) : view.getInt32(position, little);
            const denominator = type === 5 ? u32(position + 4) : view.getInt32(position + 4, little);
            values.push(denominator ? numerator / denominator : null);
          }
        }
        value = values;
      }
      entries.set(tag, { value, raw, type });
    }
    return entries;
  }
  const main = readIfd(u32(4));
  const first = (entries, tag) => entries.get(tag)?.value?.[0];
  const exif = readIfd(first(main, 0x8769) ?? 0);
  const gps = readIfd(first(main, 0x8825) ?? 0);
  const fields = {};
  for (const field of IMAGE_METADATA_FIELDS) {
    if (!field.tag) continue;
    const entry = (field.ifd === "main" ? main : exif).get(field.tag);
    if (!entry) continue;
    const value = field.type === 2 ? entry.value : entry.value?.[0];
    if (typeof value === "string") fields[field.key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) {
      if ((field.key === "iso" || field.key === "focalLength35mm") && value < 1) continue;
      if (field.key === "exposureTime") {
        // Preserve the original rational exactly for a read-edit-write cycle.
        const offset = entry.raw.byteOffset;
        const rational = new DataView(entry.raw.buffer, offset, entry.raw.byteLength);
        const numerator = rational.getUint32(0, little), denominator = rational.getUint32(4, little);
        fields[field.key] = `${numerator}/${denominator}`;
      } else fields[field.key] = String(Number(value.toFixed(8)));
    }
  }
  if (Number(fields.iso) === 65535 && first(exif, 0x8833)) fields.iso = String(first(exif, 0x8833));
  for (const [key, tag] of [["description", 0x9c9c], ["artist", 0x9c9d]]) {
    if (!fields[key] && main.get(tag)?.raw) fields[key] = new TextDecoder("utf-16le").decode(main.get(tag).raw).replace(/\0.*$/s, "");
  }
  // Unicode UserComment is standard EXIF and complements XPComment for tools
  // that do not recognise the Windows UTF-16 tags.
  const comment = exif.get(0x9286)?.raw;
  if (!fields.description && comment?.length > 8) {
    if (begins(comment, encoder.encode("UNICODE\0"))) fields.description = new TextDecoder(little ? "utf-16le" : "utf-16be").decode(comment.subarray(8)).replace(/\0.*$/s, "");
    else if (begins(comment, encoder.encode("ASCII\0\0\0"))) fields.description = decoder.decode(comment.subarray(8)).replace(/\0.*$/s, "");
  }
  for (const [key, tag, ref] of [["latitude", 2, 1], ["longitude", 4, 3]]) {
    const value = gps.get(tag)?.value;
    const direction = gps.get(ref)?.value;
    if (Array.isArray(value) && value.length === 3 && value.every((part) => typeof part === "number" && Number.isFinite(part))) {
      fields[key] = String(Number(((value[0] + value[1] / 60 + value[2] / 3600) * (direction === "S" || direction === "W" ? -1 : 1)).toFixed(8)));
    }
  }
  return { fields, orientation: first(main, 0x0112) ?? 1 };
}

function isJpegMetadata(part) {
  return part.marker === 0xe1 || part.marker === 0xed || part.marker === 0xfe ||
    (part.marker === 0xe0 && (begins(part.data, encoder.encode("JFXX\0")) || begins(part.data, encoder.encode("JFIF\0"))));
}
const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

// Presence detection only: no claims, signatures, certificates or remote
// manifests are trusted or fetched. APP11 also carries unrelated JPEG data.
function jumbfHeader(bytes, offset = 0) {
  if (offset + 8 > bytes.length) return null;
  const view = viewOf(bytes);
  let length = view.getUint32(offset), headerSize = 8;
  if (length === 1) {
    if (offset + 16 > bytes.length) return null;
    length = view.getUint32(offset + 8) * 0x100000000 + view.getUint32(offset + 12);
    headerSize = 16;
  }
  if (length < headerSize || length > MAX_BYTES) return null;
  return { length, headerSize, type: ascii(bytes.subarray(offset + 4, offset + 8)) };
}

function imageC2paParts(parts, format) {
  const matched = new Set();
  if (format === "png") {
    // caBX is the reserved C2PA storage chunk; presence does not imply validity.
    for (const part of parts) if (part.type === "caBX") matched.add(part);
    return { matched, status: matched.size ? "present" : "absent", unsafe: false };
  }
  const groups = [];
  const current = new Map();
  let unreadable = false, unsafe = false;
  for (const part of parts) {
    if (part.marker !== 0xeb || !begins(part.data, [0x4a, 0x50])) continue;
    if (part.data.length < 16) { unreadable = unsafe = true; continue; }
    if (ascii(part.data.subarray(12, 16)) !== "jumb") continue;
    const header = jumbfHeader(part.data, 8);
    if (!header) { unreadable = unsafe = true; continue; }
    const view = viewOf(part.data);
    const sequence = view.getUint32(4);
    const key = `${view.getUint16(2)}:${Array.from(part.data.subarray(8, 8 + header.headerSize)).join(",")}`;
    let group = current.get(key);
    if (!group || sequence === 1) {
      group = { header, packets: [] };
      groups.push(group); current.set(key, group);
    }
    group.packets.push({ part, sequence });
  }
  for (const group of groups) {
    // JPEG XT repeats the root LBox/TBox (and XLBox when present) in every
    // fragment. Keep that header once, then concatenate only box content.
    const bytes = join([
      group.packets[0].part.data.subarray(8, 8 + group.header.headerSize),
      ...group.packets.map(({ part }) => part.data.subarray(8 + group.header.headerSize)),
    ]);
    const at = group.header.headerSize;
    const description = jumbfHeader(bytes, at);
    if (!description || description.type !== "jumd" || description.length < description.headerSize + 17) {
      unreadable = unsafe = true; continue;
    }
    const uuidAt = at + description.headerSize;
    if (uuidAt + 16 > bytes.length) { unreadable = unsafe = true; continue; }
    if (!begins(bytes, C2PA_STORE_UUID, uuidAt)) continue;
    for (const { part } of group.packets) matched.add(part);
    const labelAt = uuidAt + 17;
    const identified = (bytes[uuidAt + 16] & 2) !== 0 &&
      labelAt + 5 <= at + description.length && begins(bytes, [99, 50, 112, 97, 0], labelAt);
    if (group.packets.some((packet, index) => packet.sequence !== index + 1)) unreadable = unsafe = true;
    if (!identified || at + description.length > bytes.length || bytes.length !== group.header.length) unreadable = true;
  }
  return { matched, status: unreadable ? "unreadable" : matched.size ? "present" : "absent", unsafe };
}

export function readImageFileC2pa(bytes) {
  const { format, parts } = container(bytes);
  return imageC2paParts(parts, format).status;
}

const xmlEscape = (text) => text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
function xmlText(text) {
  return text.replace(/<[^>]*>/g, "").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
    if (!entity.startsWith("#")) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  }).trim();
}
function readXmp(parts, format) {
  const fields = {};
  for (const part of parts) {
    let xml = "";
    if (format === "jpeg" && part.marker === 0xe1 && begins(part.data, encoder.encode(XMP))) xml = decoder.decode(part.data.subarray(XMP.length));
    if (format === "png" && part.type === "iTXt" && part.data.length < 65536) {
      const keywordEnd = part.data.indexOf(0);
      if (decoder.decode(part.data.subarray(0, keywordEnd)) !== "XML:com.adobe.xmp" || part.data[keywordEnd + 1] !== 0) continue;
      const languageEnd = part.data.indexOf(0, keywordEnd + 3), translatedEnd = part.data.indexOf(0, languageEnd + 1);
      if (languageEnd < 0 || translatedEnd < 0) continue;
      xml = decoder.decode(part.data.subarray(translatedEnd + 1));
    }
    if (!xml || xml.length > 65536) continue;
    for (const [key, tag] of [["artist", "creator"], ["copyright", "rights"], ["description", "description"]]) {
      const block = xml.match(new RegExp(`<dc:${tag}\\b[^>]*>([\\s\\S]*?)<\\/dc:${tag}>`, "i"));
      if (!block) continue;
      const listValue = block[1].match(/<rdf:li\b[^>]*>([\s\S]*?)<\/rdf:li>/i);
      const value = xmlText(listValue?.[1] ?? block[1]);
      if (value) fields[key] = value.slice(0, 500);
    }
  }
  return fields;
}

function buildXmp(fields) {
  // XMP provides standards-based Unicode rights/creator/description alongside
  // EXIF's legacy ASCII camera tags. No unrelated donor profile is transferred.
  const items = [];
  for (const [key, tag] of [["artist", "creator"], ["copyright", "rights"], ["description", "description"]]) {
    const value = fields[key];
    if (!value) continue;
    const list = key === "artist" ? "Seq" : "Alt";
    const language = key === "artist" ? "" : ' xml:lang="x-default"';
    items.push(`<dc:${tag}><rdf:${list}><rdf:li${language}>${xmlEscape(value)}</rdf:li></rdf:${list}></dc:${tag}>`);
  }
  if (!items.length) return null;
  return encoder.encode(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">${items.join("")}</rdf:Description></rdf:RDF></x:xmpmeta>`);
}

export function readImageFileMetadata(bytes) {
  const { format, parts } = container(bytes);
  const c2pa = imageC2paParts(parts, format).status;
  const exifPart = format === "jpeg" ? parts.find((part) => part.marker === 0xe1 && begins(part.data, EXIF)) : parts.find((part) => part.type === "eXIf");
  const hasMetadata = c2pa !== "absent" || parts.some((part) => format === "jpeg"
    ? part.marker === 0xe1 || part.marker === 0xed || part.marker === 0xfe
    : PNG_METADATA.has(part.type));
  const tiff = exifPart ? (format === "jpeg" ? exifPart.data.subarray(6) : exifPart.data) : null;
  const parsed = tiff ? readTiff(tiff) : { fields: {}, orientation: 1 };
  const xmpFields = readXmp(parts, format);
  for (const [key, value] of Object.entries(xmpFields)) if (!parsed.fields[key]) parsed.fields[key] = value;
  return { format, hasMetadata, c2pa, ...parsed };
}

export function validateImageMetadata(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("元数据格式无效，请粘贴复制得到的 JSON。");
  const fields = {};
  for (const field of IMAGE_METADATA_FIELDS) {
    const value = input[field.key];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") throw new Error(`${field.label}格式无效。`);
    const text = String(value).trim();
    if (!text) continue;
    if (text.length > 500 || /[\u0000-\u001f]/.test(text)) throw new Error(`${field.label}内容过长或含无效字符。`);
    if (field.type === 5 || field.type === 10) rational(text, field.type === 10, field.label, field.key === "exposureBias");
    if (field.type === 3) {
      const max = field.key === "iso" ? 10_000_000 : 65535;
      if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > max) throw new Error(`${field.label}需要填写 1 至 ${max} 的整数。`);
    }
    if (field.key === "dateTimeOriginal") {
      const match = text.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
      if (!match) throw new Error("拍摄时间请填写为 YYYY:MM:DD HH:mm:ss。");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new Error("拍摄时间不是有效日期。");
      fields[field.key] = `${match[1]}:${match[2]}:${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
      continue;
    }
    if (field.key === "latitude" || field.key === "longitude") {
      const limit = field.key === "latitude" ? 90 : 180;
      if (!/^-?\d+(?:\.\d+)?$/.test(text) || Math.abs(Number(text)) > limit) throw new Error(`${field.label}需要填写 -${limit} 至 ${limit} 的数字。`);
    }
    fields[field.key] = text;
  }
  if (Boolean(fields.latitude) !== Boolean(fields.longitude)) throw new Error("纬度和经度需要同时填写或同时清空。");
  return fields;
}

function rational(text, signed, label, allowZero = false) {
  const match = String(text).match(/^(-?\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
  const value = match ? Number(match[1]) / (match[2] ? Number(match[2]) : 1) : NaN;
  if (!Number.isFinite(value) || (!signed && value < 0) || (!allowZero && value === 0)) throw new Error(`${label}请填写有效数字或分数，例如 1/125。`);
  let numerator, denominator;
  if (match && Number.isInteger(Number(match[1])) && (!match[2] || Number.isInteger(Number(match[2])))) {
    numerator = Number(match[1]); denominator = Number(match[2] ?? 1);
  } else { denominator = 1_000_000; numerator = Math.round(value * denominator); }
  const gcd = (a, b) => { while (b) { const next = a % b; a = b; b = next; } return Math.abs(a) || 1; };
  const divisor = gcd(numerator, denominator);
  numerator /= divisor; denominator /= divisor;
  const limit = signed ? 0x7fffffff : 0xffffffff;
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || Math.abs(numerator) > limit || denominator < 1 || denominator > limit || (!allowZero && numerator === 0)) throw new Error(`${label}超出可写入范围。`);
  return [numerator, denominator];
}

function utf16(text) {
  const bytes = new Uint8Array((text.length + 1) * 2);
  const view = viewOf(bytes);
  for (let index = 0; index < text.length; index++) view.setUint16(index * 2, text.charCodeAt(index), true);
  return bytes;
}
function entry(tag, type, values) {
  if (type === 2) { const bytes = join([encoder.encode(values), new Uint8Array(1)]); return { tag, type, count: bytes.length, bytes }; }
  if (type === 1 || type === 7) return { tag, type, count: values.length, bytes: values };
  const bytes = new Uint8Array(TYPE_SIZE[type] * values.length);
  const view = viewOf(bytes);
  values.forEach((value, index) => {
    const at = index * TYPE_SIZE[type];
    if (type === 3) view.setUint16(at, value, true);
    if (type === 4) view.setUint32(at, value, true);
    if (type === 5 || type === 10) {
      const method = type === 5 ? "setUint32" : "setInt32";
      view[method](at, value[0], true); view[method](at + 4, value[1], true);
    }
  });
  return { tag, type, count: values.length, bytes };
}

function buildExif(fields, orientation) {
  const groups = { main: [], exif: [], gps: [] };
  for (const field of IMAGE_METADATA_FIELDS) {
    const value = fields[field.key];
    if (!value || !field.tag) continue;
    if (field.type === 2 && /[^\x20-\x7e]/.test(value)) {
      if (field.key === "copyright") continue; // Stored in dc:rights XMP.
      if (field.key === "artist" || field.key === "description") {
        groups.main.push(entry(field.key === "artist" ? 0x9c9d : 0x9c9c, 1, utf16(value)));
        if (field.key === "description") groups.exif.push(entry(0x9286, 7, join([encoder.encode("UNICODE\0"), utf16(value)])));
        continue;
      }
      throw new Error(`${field.label}目前需要使用英文或数字；作者与描述支持中文。`);
    }
    const values = field.type === 2 ? value : field.type === 3 ? [Math.min(Number(value), 65535)]
      : [rational(value, field.type === 10, field.label, field.key === "exposureBias")];
    groups[field.ifd].push(entry(field.tag, field.type, values));
    if (field.key === "iso" && Number(value) > 65535) {
      groups.exif.push(entry(0x8830, 3, [3]), entry(0x8833, 4, [Number(value)]));
    }
  }
  if (orientation > 1 && orientation <= 8) groups.main.push(entry(0x0112, 3, [orientation]));
  if (fields.latitude && fields.longitude) {
    groups.gps.push(entry(0, 1, new Uint8Array([2, 3, 0, 0])));
    for (const [key, tag, ref] of [["latitude", 2, 1], ["longitude", 4, 3]]) {
      const value = Number(fields[key]), absolute = Math.abs(value);
      const totalSeconds = Math.round(absolute * 3600 * 1_000_000);
      const degrees = Math.floor(totalSeconds / (3600 * 1_000_000));
      const minutes = Math.floor((totalSeconds - degrees * 3600 * 1_000_000) / (60 * 1_000_000));
      groups.gps.push(entry(ref, 2, key === "latitude" ? (value < 0 ? "S" : "N") : (value < 0 ? "W" : "E")));
      const seconds = totalSeconds - degrees * 3600 * 1_000_000 - minutes * 60 * 1_000_000;
      groups.gps.push(entry(tag, 5, [[degrees, 1], [minutes, 1], [seconds, 1_000_000]]));
    }
  }
  if (groups.exif.length) {
    groups.exif.push(entry(0x9000, 7, encoder.encode("0232")));
    groups.main.push(entry(0x8769, 4, [0]));
  }
  if (groups.gps.length) groups.main.push(entry(0x8825, 4, [0]));
  const active = Object.entries(groups).filter(([name, entries]) => name === "main" || entries.length);
  let cursor = 8;
  const offsets = {};
  for (const [name, entries] of active) { offsets[name] = cursor; cursor += 2 + entries.length * 12 + 4; }
  for (const [, entries] of active) for (const item of entries) if (item.bytes.length > 4) cursor += item.bytes.length + item.bytes.length % 2;
  if (cursor > 65527) throw new Error("元数据过大，请缩短文字后重试。");
  const bytes = new Uint8Array(cursor), view = viewOf(bytes);
  bytes.set([73, 73, 42, 0]); view.setUint32(4, 8, true);
  let dataAt = active.reduce((size, [, entries]) => size + 2 + entries.length * 12 + 4, 8);
  for (const [name, entries] of active) {
    entries.sort((a, b) => a.tag - b.tag);
    view.setUint16(offsets[name], entries.length, true);
    entries.forEach((item, index) => {
      const at = offsets[name] + 2 + index * 12;
      view.setUint16(at, item.tag, true); view.setUint16(at + 2, item.type, true); view.setUint32(at + 4, item.count, true);
      if (item.tag === 0x8769 || item.tag === 0x8825) view.setUint32(at + 8, offsets[item.tag === 0x8769 ? "exif" : "gps"], true);
      else if (item.bytes.length <= 4) bytes.set(item.bytes, at + 8);
      else { view.setUint32(at + 8, dataAt, true); bytes.set(item.bytes, dataAt); dataAt += item.bytes.length + item.bytes.length % 2; }
    });
  }
  return bytes;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, payload) {
  const bytes = new Uint8Array(payload.length + 12), view = viewOf(bytes);
  view.setUint32(0, payload.length); bytes.set(encoder.encode(type), 4); bytes.set(payload, 8);
  view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)));
  return bytes;
}

export function writeImageFileMetadata(bytes, input, options = {}) {
  const { format, parts } = container(bytes);
  const credentials = options.clear ? imageC2paParts(parts, format) : null;
  if (credentials?.unsafe) throw new Error("图片中有无法完整识别的内容凭证数据，暂时无法安全清除。请使用完整原图。");
  const fields = options.clear ? {} : validateImageMetadata(input);
  const orientation = options.orientation ?? 1;
  const exif = !options.clear && (Object.keys(fields).length || orientation > 1) ? buildExif(fields, orientation) : null;
  const xmp = !options.clear ? buildXmp(fields) : null;
  if (format === "jpeg") {
    const segments = [bytes.subarray(0, 2)];
    if (exif) {
      const payload = join([new Uint8Array(EXIF), exif]);
      const header = new Uint8Array([255, 225, 0, 0]); viewOf(header).setUint16(2, payload.length + 2);
      segments.push(header, payload);
    }
    if (xmp) {
      const payload = join([encoder.encode(XMP), xmp]);
      const header = new Uint8Array([255, 225, 0, 0]); viewOf(header).setUint16(2, payload.length + 2);
      segments.push(header, payload);
    }
    for (const part of parts) {
      if (credentials?.matched.has(part)) continue;
      if (isJpegMetadata(part)) {
        // Retain JFIF version/density conventions but remove its thumbnail.
        if (part.marker === 0xe0 && begins(part.data, encoder.encode("JFIF\0")) && part.data.length >= 14) {
          const payload = part.data.slice(0, 14); payload[12] = 0; payload[13] = 0;
          segments.push(new Uint8Array([255, 224, 0, 16]), payload);
        }
        continue;
      }
      segments.push(bytes.subarray(part.start, part.end));
    }
    return { bytes: join(segments), mimeType: "image/jpeg", extension: "jpg" };
  }
  const chunks = [bytes.subarray(0, 8)];
  for (const part of parts) {
    if (credentials?.matched.has(part)) continue;
    if (PNG_METADATA.has(part.type)) continue;
    chunks.push(bytes.subarray(part.start, part.end));
    if (part.type === "IHDR") {
      if (exif) chunks.push(pngChunk("eXIf", exif));
      if (xmp) chunks.push(pngChunk("iTXt", join([encoder.encode("XML:com.adobe.xmp"), new Uint8Array(5), xmp])));
    }
  }
  return { bytes: join(chunks), mimeType: "image/png", extension: "png" };
}

export function copyImageMetadataJson(fields) {
  return JSON.stringify({ version: 1, fields: validateImageMetadata(fields) }, null, 2);
}
export function parseImageMetadataJson(text) {
  if (typeof text !== "string" || text.length > 20_000) throw new Error("粘贴的元数据过长或格式无效。");
  let input;
  try { input = JSON.parse(text); } catch { throw new Error("请粘贴有效的元数据 JSON。"); }
  return validateImageMetadata(input?.fields ?? input);
}
