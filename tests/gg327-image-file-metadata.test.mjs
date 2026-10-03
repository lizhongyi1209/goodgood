import test from "node:test";
import assert from "node:assert/strict";
import { copyImageMetadataJson, parseImageMetadataJson, readImageFileMetadata, validateImageMetadata, writeImageFileMetadata } from "../features/assets/image-file-metadata.mjs";

// Generated, tiny fixtures; no real photos, database, worker or provider.
const PNG = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64"));
const SOI = new Uint8Array([255, 216]);
const EOI = new Uint8Array([255, 217]);
const concat = (...parts) => new Uint8Array(Buffer.concat(parts.map((part) => Buffer.from(part))));
function jpegSegment(marker, payload) {
  const header = new Uint8Array([255, marker, 0, 0]);
  new DataView(header.buffer).setUint16(2, payload.length + 2);
  return concat(header, payload);
}
const JFIF = jpegSegment(0xe0, new Uint8Array([74, 70, 73, 70, 0, 1, 2, 0, 0, 1, 0, 1, 0, 0]));
const ICC = jpegSegment(0xe2, new TextEncoder().encode("ICC_PROFILE\0retained"));
const SOS = jpegSegment(0xda, new Uint8Array([1, 1, 0, 0, 63, 0]));
const PIXELS = new Uint8Array([3, 6, 255, 0, 18, 255, 208, 24]);
const JPEG = concat(SOI, JFIF, ICC, SOS, PIXELS, EOI);
const fields = {
  make: "Canon", model: "EOS R5", lensMake: "Canon", lensModel: "RF 50mm F1.2 L USM", exposureTime: "1/125",
  fNumber: "2.8", iso: "100", focalLength: "50", focalLength35mm: "50", exposureBias: "-1/3",
  dateTimeOriginal: "2026:10:03 12:00:00", artist: "摄影作者", copyright: "版权所有 & <GoodGood>", description: "测试参数副本", software: "GoodGood",
  latitude: "31.2304", longitude: "121.4737",
};
function pngChunks(bytes) {
  const chunks = [];
  for (let at = 8; at + 12 <= bytes.length;) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0);
    const type = Buffer.from(bytes.subarray(at + 4, at + 8)).toString("ascii");
    chunks.push({ type, bytes: bytes.subarray(at, at + length + 12), data: bytes.subarray(at + 8, at + length + 8) });
    at += length + 12;
  }
  return chunks;
}

test("empty JPEG and PNG report no invented camera data", () => {
  for (const bytes of [JPEG, PNG]) {
    const metadata = readImageFileMetadata(bytes);
    assert.deepEqual(metadata.fields, {});
    assert.equal(metadata.hasMetadata, false);
    assert.equal(metadata.orientation, 1);
  }
});

for (const [format, bytes] of [["jpeg", JPEG], ["png", PNG]]) {
  test(`${format}: camera fields, Unicode and signed GPS round trip`, () => {
    const written = writeImageFileMetadata(bytes, fields);
    const result = readImageFileMetadata(written.bytes);
    assert.equal(result.format, format);
    assert.equal(result.hasMetadata, true);
    for (const [key, value] of Object.entries(fields)) {
      if (key === "exposureBias") assert.ok(Math.abs(Number(result.fields[key]) + 1 / 3) < 0.00000001);
      else assert.equal(result.fields[key], value, key);
    }
    assert.equal(written.mimeType, `image/${format}`);
  });

  test(`${format}: clear removes EXIF/GPS/text and retains the image payload`, () => {
    const annotated = writeImageFileMetadata(bytes, fields, { orientation: 6 });
    const cleared = writeImageFileMetadata(annotated.bytes, {}, { clear: true });
    assert.deepEqual(readImageFileMetadata(cleared.bytes).fields, {});
    assert.equal(readImageFileMetadata(cleared.bytes).hasMetadata, false);
    assert.equal(readImageFileMetadata(cleared.bytes).orientation, 1);
    assert.deepEqual(cleared.bytes, bytes);
    assert.deepEqual(bytes, format === "jpeg" ? JPEG : PNG);
  });

  test(`${format}: target orientation stays independent of donor camera fields`, () => {
    const result = writeImageFileMetadata(bytes, { model: "EOS R5" }, { orientation: 8 });
    assert.equal(readImageFileMetadata(result.bytes).orientation, 8);
    assert.equal(readImageFileMetadata(result.bytes).fields.model, "EOS R5");
  });
}

test("JPEG clear removes XMP/IPTC/comment even between progressive scans", () => {
  const xmp = jpegSegment(0xe1, new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0old"));
  const iptc = jpegSegment(0xed, new TextEncoder().encode("Photoshop 3.0\0private"));
  const comment = jpegSegment(0xfe, new TextEncoder().encode("private prompt"));
  const file = concat(SOI, JFIF, xmp, ICC, SOS, PIXELS, iptc, comment, SOS, PIXELS, EOI);
  const cleared = writeImageFileMetadata(file, {}, { clear: true });
  assert.deepEqual(cleared.bytes, concat(SOI, JFIF, ICC, SOS, PIXELS, SOS, PIXELS, EOI));
});

test("PNG EXIF chunk precedes image data and retains IDAT bytes", () => {
  const before = pngChunks(PNG), after = pngChunks(writeImageFileMetadata(PNG, fields).bytes);
  assert.ok(after.findIndex((chunk) => chunk.type === "eXIf") < after.findIndex((chunk) => chunk.type === "IDAT"));
  assert.deepEqual(after.find((chunk) => chunk.type === "IDAT").bytes, before.find((chunk) => chunk.type === "IDAT").bytes);
  const exif = after.find((chunk) => chunk.type === "eXIf");
  assert.deepEqual([...exif.data.subarray(0, 4)], [73, 73, 42, 0]);
});

test("big-endian TIFF camera strings and rationals are extracted", () => {
  const tiff = new Uint8Array(75), view = new DataView(tiff.buffer);
  tiff.set([77, 77, 0, 42]); view.setUint32(4, 8); view.setUint16(8, 2);
  view.setUint16(10, 0x010f); view.setUint16(12, 2); view.setUint32(14, 6); view.setUint32(18, 38);
  view.setUint16(22, 0x8769); view.setUint16(24, 4); view.setUint32(26, 1); view.setUint32(30, 44);
  tiff.set(new TextEncoder().encode("Canon\0"), 38);
  view.setUint16(44, 1); view.setUint16(46, 0x829a); view.setUint16(48, 5); view.setUint32(50, 1); view.setUint32(54, 62);
  view.setUint32(62, 1); view.setUint32(66, 250);
  const exif = jpegSegment(0xe1, concat(new Uint8Array([69, 120, 105, 102, 0, 0]), tiff));
  const result = readImageFileMetadata(concat(SOI, exif, JFIF, SOS, PIXELS, EOI));
  assert.equal(result.fields.make, "Canon"); assert.equal(result.fields.exposureTime, "1/250");
});

test("JSON copy/paste transfers allowlisted values, keeps zero exposure and rejects invalid drafts", () => {
  assert.deepEqual(parseImageMetadataJson(copyImageMetadataJson({ ...fields, exposureBias: "0" })), { ...fields, exposureBias: "0" });
  assert.deepEqual(parseImageMetadataJson('{"fields":{"make":"Canon","unknown":"ignored"}}'), { make: "Canon" });
  assert.throws(() => parseImageMetadataJson("not JSON"), /JSON/);
  assert.throws(() => validateImageMetadata({ exposureTime: "1/0" }), /快门/);
  assert.throws(() => validateImageMetadata({ fNumber: "0" }), /光圈/);
  assert.throws(() => validateImageMetadata({ iso: "1.5" }), /ISO/);
  assert.throws(() => validateImageMetadata({ latitude: "31" }), /同时/);
  assert.throws(() => validateImageMetadata({ latitude: "91", longitude: "0" }), /纬度/);
  assert.throws(() => validateImageMetadata({ dateTimeOriginal: "2026:02:30 12:00:00" }), /日期/);
  assert.throws(() => parseImageMetadataJson("x".repeat(20_001)), /过长/);
});

test("high ISO and western hemisphere GPS values survive a copy", () => {
  const result = readImageFileMetadata(writeImageFileMetadata(JPEG, { iso: "102400", latitude: "-33.8568", longitude: "-151.2153" }).bytes);
  assert.equal(result.fields.iso, "102400"); assert.equal(result.fields.latitude, "-33.8568"); assert.equal(result.fields.longitude, "-151.2153");
});

test("unsupported, oversized and malformed input fail without mutating the source", () => {
  assert.throws(() => readImageFileMetadata(new Uint8Array([71, 73, 70, 56])), /JPEG.*PNG/);
  assert.throws(() => writeImageFileMetadata(JPEG.subarray(0, 18), fields), /JPEG|损坏/);
  assert.throws(() => readImageFileMetadata(PNG.subarray(0, 22)), /损坏/);
  assert.throws(() => readImageFileMetadata(new Uint8Array(20 * 1024 * 1024 + 1)), /20 MB/);
  const malformed = concat(SOI, jpegSegment(0xe1, new Uint8Array([69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 255, 255, 255, 255])), SOS, PIXELS, EOI);
  assert.throws(() => readImageFileMetadata(malformed), /损坏/);
  assert.doesNotThrow(() => writeImageFileMetadata(malformed, {}, { clear: true }));
  assert.deepEqual(JPEG, concat(SOI, JFIF, ICC, SOS, PIXELS, EOI));
});
