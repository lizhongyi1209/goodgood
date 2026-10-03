import { IMAGE_METADATA_FIELDS } from "./image-file-metadata.mjs";

// Sample input values, never measurements recovered from the selected image.
const cameraKits = [
  ["Canon", "EOS R5", "RF24-70mm F2.8 L IS USM"],
  ["Canon", "EOS R6 Mark II", "RF24-70mm F2.8 L IS USM"],
  ["Canon", "EOS R3", "RF24-70mm F2.8 L IS USM"],
  ["Nikon", "Z 5", "NIKKOR Z 24-70mm f/2.8 S"],
  ["Nikon", "Z 6II", "NIKKOR Z 24-70mm f/2.8 S"],
  ["Nikon", "Z 7II", "NIKKOR Z 24-70mm f/2.8 S"],
  ["Nikon", "Z 8", "NIKKOR Z 24-70mm f/2.8 S"],
  ["Sony", "ILCE-7M3", "FE 24-70mm F2.8 GM II"],
  ["Sony", "ILCE-7M4", "FE 24-70mm F2.8 GM II"],
  ["Sony", "ILCE-7RM4", "FE 24-70mm F2.8 GM II"],
];
const exposureProfiles = [
  ["1/160", "2.8", "100", "35", "0"],
  ["1/250", "4", "200", "50", "-0.3"],
  ["1/125", "5.6", "100", "24", "0.3"],
  ["1/500", "2.8", "400", "70", "0"],
  ["1/80", "8", "200", "28", "-0.7"],
  ["1/320", "4", "800", "40", "0.3"],
  ["1/60", "2.8", "1600", "55", "0.7"],
  ["1/100", "11", "100", "60", "0"],
  ["1/1000", "5.6", "800", "65", "-1"],
  ["1/30", "2.8", "3200", "70", "1"],
];
const pad = (value) => String(value).padStart(2, "0");

export const RANDOM_IMAGE_METADATA_PRESETS = Object.freeze(cameraKits.flatMap(([make, model, lensModel], cameraIndex) =>
  exposureProfiles.map(([exposureTime, fNumber, iso, focalLength, exposureBias], profileIndex) => {
    const index = cameraIndex * exposureProfiles.length + profileIndex;
    return Object.freeze({
      make, model, lensMake: make, lensModel, exposureTime, fNumber, iso,
      focalLength, focalLength35mm: focalLength, exposureBias,
      dateTimeOriginal: `2026:09:${pad(1 + Math.floor(index / 4))} ${pad(7 + index % 12)}:${pad(index * 17 % 60)}:${pad(index * 13 % 60)}`,
    });
  })));

export function createRandomImageMetadataPicker(random = Math.random) {
  let remaining = [];
  let previous = -1;
  return () => {
    if (!remaining.length) {
      remaining = RANDOM_IMAGE_METADATA_PRESETS.map((_, index) => index);
      for (let index = remaining.length - 1; index > 0; index--) {
        const selected = Math.floor(random() * (index + 1));
        [remaining[index], remaining[selected]] = [remaining[selected], remaining[index]];
      }
      const last = remaining.length - 1;
      if (remaining[last] === previous) [remaining[0], remaining[last]] = [remaining[last], remaining[0]];
    }
    previous = remaining.pop();
    return { ...RANDOM_IMAGE_METADATA_PRESETS[previous] };
  };
}

export function hasImageMetadataContent(fields) {
  return IMAGE_METADATA_FIELDS.some(({ key, group }) => group !== "位置信息" &&
    typeof fields?.[key] === "string" && fields[key].trim().length > 0);
}
