import test from "node:test";
import assert from "node:assert/strict";
import { readImageFileC2pa, readImageFileMetadata, writeImageFileMetadata } from "../features/assets/image-file-metadata.mjs";

// Synthetic containers exercise storage detection, not signature validation.
// No real assets, certificates, external manifests, worker or provider.
const encode = (value) => new TextEncoder().encode(value);
const concat = (...parts) => new Uint8Array(Buffer.concat(parts.map((part) => Buffer.from(part))));
const UUID = new Uint8Array([0x63, 0x32, 0x70, 0x61, 0, 0x11, 0, 0x10, 0x80, 0, 0, 0xaa, 0, 0x38, 0x9b, 0x71]);
const SOI = new Uint8Array([255, 216]), EOI = new Uint8Array([255, 217]);
function segment(marker, payload) {
  const header = new Uint8Array([255, marker, 0, 0]);
  new DataView(header.buffer).setUint16(2, payload.length + 2);
  return concat(header, payload);
}
const ICC = segment(0xe2, encode("ICC_PROFILE\0unchanged"));
const SOS = segment(0xda, new Uint8Array([1, 1, 0, 0, 63, 0]));
const PIXELS = new Uint8Array([3, 255, 0, 6, 255, 208, 18]);
const JPEG = concat(SOI, ICC, SOS, PIXELS, EOI);
const PNG = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64"));
function box(type, payload, extended = false) {
  const header = new Uint8Array(extended ? 16 : 8), view = new DataView(header.buffer);
  view.setUint32(0, extended ? 1 : header.length + payload.length);
  header.set(encode(type), 4);
  if (extended) view.setUint32(12, header.length + payload.length);
  return concat(header, payload);
}
function store({ uuid = UUID, label = "c2pa", extended = false } = {}) {
  return box("jumb", concat(box("jumd", concat(uuid, new Uint8Array([3]), encode(`${label}\0`)), extended), box("cbor", new Uint8Array([0xa0]))), extended);
}
function fragments(bytes, cuts = [], instance = 529) {
  const rootSize = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) === 1 ? 16 : 8;
  const payload = bytes.subarray(rootSize), points = [0, ...cuts, payload.length];
  return points.slice(0, -1).map((start, index) => {
    const packet = new Uint8Array(8), view = new DataView(packet.buffer);
    packet.set([0x4a, 0x50]); view.setUint16(2, instance); view.setUint32(4, index + 1);
    return segment(0xeb, concat(packet, bytes.subarray(0, rootSize), payload.subarray(start, points[index + 1])));
  });
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, payload) {
  const bytes = new Uint8Array(payload.length + 12), view = new DataView(bytes.buffer);
  view.setUint32(0, payload.length); bytes.set(encode(type), 4); bytes.set(payload, 8);
  view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)));
  return bytes;
}
const clear = (bytes) => writeImageFileMetadata(bytes, {}, { clear: true }).bytes;

test("ordinary files contain no embedded credentials or invented camera fields", () => {
  for (const file of [JPEG, PNG]) {
    assert.equal(readImageFileC2pa(file), "absent");
    assert.equal(readImageFileMetadata(file).hasMetadata, false);
    assert.deepEqual(readImageFileMetadata(file).fields, {});
  }
});

for (const extended of [false, true]) {
  test(`JPEG detects/removes complete and fragmented credentials with ${extended ? "XLBox" : "LBox"}`, () => {
    // Description UUID and label also cross packet boundaries.
    for (const cuts of [[], [4, 13, 25]]) {
      const packets = fragments(store({ extended }), cuts);
      const file = concat(SOI, ...packets, ICC, SOS, PIXELS, EOI), before = file.slice();
      assert.equal(readImageFileC2pa(file), "present");
      assert.equal(readImageFileMetadata(file).c2pa, "present");
      assert.equal(readImageFileMetadata(file).hasMetadata, true);
      assert.deepEqual(clear(file), JPEG);
      assert.deepEqual(file, before);
      assert.equal(readImageFileC2pa(clear(file)), "absent");
    }
  });
}

test("unrelated APP11/JUMBF stays intact, even with reused instance and C2PA words", () => {
  const otherUuid = UUID.slice(); otherUuid[0] = 0x7f;
  const other = fragments(store({ uuid: otherUuid }), [9], 529);
  const plain = segment(0xeb, encode("c2pa is text, not a manifest store"));
  const cai = fragments(store(), [14], 529);
  const file = concat(SOI, ...other, plain, ...cai, ICC, SOS, PIXELS, EOI);
  assert.equal(readImageFileC2pa(concat(SOI, ...other, plain, ICC, SOS, PIXELS, EOI)), "absent");
  assert.equal(readImageFileC2pa(file), "present");
  assert.deepEqual(clear(file), concat(SOI, ...other, plain, ICC, SOS, PIXELS, EOI));
});

test("C2PA after the first progressive scan is removed without touching scan bytes", () => {
  const file = concat(SOI, ICC, SOS, PIXELS, ...fragments(store(), [18]), SOS, PIXELS, EOI);
  assert.equal(readImageFileC2pa(file), "present");
  assert.deepEqual(clear(file), concat(SOI, ICC, SOS, PIXELS, SOS, PIXELS, EOI));
});

test("all PNG caBX chunks are removed while IDAT and unrelated chunks remain exact", () => {
  // The first chunk ends at 33; the final IEND is 12 bytes long.
  const unrelated = chunk("caBY", encode("keep"));
  const expected = concat(PNG.subarray(0, 33), unrelated, PNG.subarray(33));
  const file = concat(PNG.subarray(0, 33), chunk("caBX", store()), unrelated, PNG.subarray(33, -12), chunk("caBX", encode("incomplete, not verified")), PNG.subarray(-12));
  assert.equal(readImageFileC2pa(file), "present");
  assert.equal(readImageFileMetadata(file).hasMetadata, true);
  assert.deepEqual(clear(file), expected);
  assert.equal(readImageFileC2pa(clear(file)), "absent");
});

test("ordinary editing preserves embedded credential bytes without claiming they validate", () => {
  const packets = fragments(store(), [13]);
  const jpg = concat(SOI, ...packets, ICC, SOS, PIXELS, EOI);
  const pngCai = chunk("caBX", store());
  const png = concat(PNG.subarray(0, 33), pngCai, PNG.subarray(33));
  for (const [file, payloads] of [[jpg, packets], [png, [pngCai]]]) {
    const output = writeImageFileMetadata(file, { model: "Edited" }).bytes;
    assert.equal(readImageFileC2pa(output), "present");
    for (const payload of payloads) assert.ok(Buffer.from(output).includes(Buffer.from(payload)));
    assert.equal(readImageFileMetadata(output).fields.model, "Edited");
  }
});

test("credential detection remains available when independent EXIF is malformed", () => {
  const malformedExif = segment(0xe1, concat(encode("Exif\0\0"), new Uint8Array([73, 73, 42])));
  const file = concat(SOI, malformedExif, ...fragments(store()), ICC, SOS, PIXELS, EOI);
  assert.equal(readImageFileC2pa(file), "present");
  assert.throws(() => readImageFileMetadata(file), /损坏/);
  assert.deepEqual(clear(file), JPEG);
});

test("a truncated identified C2PA store is reported incomplete but can be removed", () => {
  const truncated = store().slice(0, -2);
  const file = concat(SOI, ...fragments(truncated), ICC, SOS, PIXELS, EOI);
  assert.equal(readImageFileC2pa(file), "unreadable");
  assert.deepEqual(clear(file), JPEG);
});

test("unknown truncated JUMBF fails cleanup without claiming absence or changing the source", () => {
  const truncated = store().slice(0, 15);
  const file = concat(SOI, ...fragments(truncated), ICC, SOS, PIXELS, EOI), before = file.slice();
  assert.equal(readImageFileC2pa(file), "unreadable");
  assert.throws(() => clear(file), /无法.*识别.*安全清除/);
  assert.deepEqual(file, before);
});

test("ambiguous JUMBF alongside known C2PA does not report complete cleanup", () => {
  const unknown = fragments(store().slice(0, 15), [], 530);
  const file = concat(SOI, ...fragments(store()), ...unknown, ICC, SOS, PIXELS, EOI);
  assert.equal(readImageFileC2pa(file), "unreadable");
  assert.throws(() => clear(file), /安全清除/);
});

test("missing or repeated JPEG packet sequence cannot cause ambiguous APP11 deletion", () => {
  for (const sequence of [1, 3]) {
    const packets = fragments(store(), [30]);
    // APP11 marker + length are four bytes before the JPEG XT packet.
    new DataView(packets[1].buffer).setUint32(8, sequence);
    const file = concat(SOI, ...packets, ICC, SOS, PIXELS, EOI), before = file.slice();
    assert.equal(readImageFileC2pa(file), "unreadable");
    assert.throws(() => clear(file), /安全清除/);
    assert.deepEqual(file, before);
  }
});

test("invalid image/container lengths still fail closed", () => {
  assert.throws(() => readImageFileC2pa(new Uint8Array([1, 2, 3])), /JPEG.*PNG/);
  assert.throws(() => readImageFileC2pa(JPEG.subarray(0, 8)), /损坏|JPEG/);
});
