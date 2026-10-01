import assert from "node:assert/strict";
import { test } from "node:test";
import { viewerThumbnailLayout } from "../features/assets/image-viewer-navigation.mjs";

test("mixed aspect ratios retain a gap even beside the enlarged selected thumbnail", () => {
  const items = [{ width: 900, height: 1190 }, { width: 2400, height: 300 }, {}, { width: 200, height: 2000 }, { width: 640, height: 480 }];
  for (const compact of [false, true]) {
    for (let selected = 0; selected < items.length; selected += 1) {
      const layout = viewerThumbnailLayout(items, selected, compact);
      assert.equal(layout[selected].offset, 0);
      for (let index = 1; index < layout.length; index += 1) {
        const previousHeight = layout[index - 1].height * (index - 1 === selected ? 1.12 : 1);
        const currentHeight = layout[index].height * (index === selected ? 1.12 : 1);
        const gap = layout[index].offset - layout[index - 1].offset - (previousHeight + currentHeight) / 2;
        assert.ok(Math.abs(gap - (compact ? 8 : 10)) < 1e-8);
      }
    }
  }
});

test("selection changes center the new thumbnail and preserve source order", () => {
  const items = Array.from({ length: 36 }, (_, index) => ({ width: 100 + index * 37, height: 400 }));
  for (const selected of [0, 17, 18, 35]) {
    const layout = viewerThumbnailLayout(items, selected);
    assert.equal(layout[selected].offset, 0);
    assert.ok(layout.slice(0, selected).every((item) => item.offset < 0));
    assert.ok(layout.slice(selected + 1).every((item) => item.offset > 0));
  }
});

test("empty, single, unknown and invalid dimensions produce bounded geometry", () => {
  assert.deepEqual(viewerThumbnailLayout([], -1), []);
  assert.deepEqual(viewerThumbnailLayout([{}], 99), [{ height: 64, offset: 0 }]);
  assert.deepEqual(viewerThumbnailLayout([{}], -1, true), [{ height: 50, offset: 0 }]);
  const items = [{ width: 0, height: 100 }, { width: Infinity, height: 100 }, { width: 100, height: NaN }, { width: -1, height: 100 }];
  const layout = viewerThumbnailLayout(items, -1);
  assert.ok(layout.every((item) => item.height === 64 && Number.isFinite(item.offset)));
});
