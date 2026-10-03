import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_METADATA_FIELDS, readImageFileMetadata, validateImageMetadata, writeImageFileMetadata } from "../features/assets/image-file-metadata.mjs";
import { RANDOM_IMAGE_METADATA_PRESETS, createRandomImageMetadataPicker, hasImageMetadataContent } from "../features/assets/image-metadata-presets.mjs";

// Synthetic fixture only; no user photos, database, billing or provider.
const PNG = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=", "base64"));
const shootingKeys = IMAGE_METADATA_FIELDS.filter(({ group }) => group === "拍摄参数").map(({ key }) => key).sort();
const signature = (fields) => JSON.stringify(fields);

test("100 distinct camera sets contain only complete, writable shooting parameters", () => {
  assert.equal(RANDOM_IMAGE_METADATA_PRESETS.length, 100);
  assert.equal(new Set(RANDOM_IMAGE_METADATA_PRESETS.map(signature)).size, 100);
  for (const fields of RANDOM_IMAGE_METADATA_PRESETS) {
    assert.deepEqual(Object.keys(fields).sort(), shootingKeys);
    assert.ok(Object.values(fields).every((value) => typeof value === "string" && value.trim()));
    assert.deepEqual(validateImageMetadata(fields), fields);
    assert.equal(fields.make, fields.lensMake);
    assert.equal(fields.focalLength, fields.focalLength35mm);
    assert.ok(Number(fields.focalLength) >= 24 && Number(fields.focalLength) <= 70);
    assert.ok(Number(fields.fNumber) >= 2.8);
  }
});

test("all presets round trip through the existing image writer without image information or coordinates", () => {
  for (const fields of RANDOM_IMAGE_METADATA_PRESETS) {
    const read = readImageFileMetadata(writeImageFileMetadata(PNG, fields).bytes);
    assert.deepEqual(Object.keys(read.fields).sort(), shootingKeys);
    for (const key of ["make", "model", "lensMake", "lensModel", "exposureTime", "iso", "dateTimeOriginal"]) {
      assert.equal(read.fields[key], fields[key], key);
    }
    for (const key of ["fNumber", "focalLength", "focalLength35mm", "exposureBias"]) {
      assert.ok(Math.abs(Number(read.fields[key]) - Number(fields[key])) < 0.000001, key);
    }
  }
  assert.equal(readImageFileMetadata(PNG).hasMetadata, false);
});

test("each shuffled cycle visits all 100 sets and avoids a repeat at the cycle boundary", () => {
  let calls = 0;
  // Identity first cycle, rotation next cycle would repeat the boundary without the guard.
  const pick = createRandomImageMetadataPicker(() => ++calls <= 99 ? 0.999999 : 0);
  const first = Array.from({ length: 100 }, () => pick());
  const second = Array.from({ length: 100 }, () => pick());
  const expected = new Set(RANDOM_IMAGE_METADATA_PRESETS.map(signature));
  assert.deepEqual(new Set(first.map(signature)), expected);
  assert.deepEqual(new Set(second.map(signature)), expected);
  assert.notDeepEqual(first.at(-1), second[0]);
});

test("editing a picked draft cannot alter the shared preset pool or later drafts", () => {
  const pick = createRandomImageMetadataPicker(() => 0.999999);
  const pool = RANDOM_IMAGE_METADATA_PRESETS.map(signature);
  const draft = pick();
  draft.make = "手动修改";
  draft.artist = "作者";
  const next = pick();
  assert.notEqual(next.make, draft.make);
  assert.equal(next.artist, undefined);
  assert.deepEqual(RANDOM_IMAGE_METADATA_PRESETS.map(signature), pool);
});

test("confirmation requires any single nonblank editable field, including zero exposure bias", () => {
  assert.equal(hasImageMetadataContent({}), false);
  assert.equal(hasImageMetadataContent({ make: " \t ", artist: "", description: "\n" }), false);
  assert.equal(hasImageMetadataContent({ latitude: "31", longitude: "121", unknown: "value" }), false);
  for (const { key, group } of IMAGE_METADATA_FIELDS) {
    if (group !== "位置信息") assert.equal(hasImageMetadataContent({ [key]: " value " }), true, key);
  }
  assert.equal(hasImageMetadataContent({ exposureBias: "0" }), true);
  // Presence enables confirmation; the existing writer still reports malformed values.
  assert.equal(hasImageMetadataContent({ iso: "invalid" }), true);
  assert.throws(() => writeImageFileMetadata(PNG, { iso: "invalid" }), /ISO/);
});
