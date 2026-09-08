import type { GenerationReference } from "@/shared/contracts/generation";
import type { ReferenceMaterial } from "@/features/references/http-reference-library";

export type ReferenceSelectionResult = Readonly<{
  addedCount: number;
  duplicateCount: number;
  overflowCount: number;
  references: readonly GenerationReference[];
}>;

export function appendReferenceMaterials(
  current: readonly GenerationReference[],
  selected: readonly ReferenceMaterial[],
  limit: number,
): ReferenceSelectionResult {
  const knownIds = new Set(current.map((reference) => reference.id));
  const additions: GenerationReference[] = [];
  let duplicateCount = 0;
  let overflowCount = 0;

  for (const material of selected) {
    if (knownIds.has(material.id)) {
      duplicateCount += 1;
      continue;
    }
    if (current.length + additions.length >= limit) {
      overflowCount += 1;
      continue;
    }
    knownIds.add(material.id);
    additions.push({
      id: material.id,
      name: material.name,
      status: "ready",
      url: material.url,
    });
  }

  return {
    addedCount: additions.length,
    duplicateCount,
    overflowCount,
    references: [...current, ...additions],
  };
}

export function reorderReferences(
  current: readonly GenerationReference[],
  sourceId: string,
  targetId: string,
): readonly GenerationReference[] {
  const sourceIndex = current.findIndex((reference) => reference.id === sourceId);
  const targetIndex = current.findIndex((reference) => reference.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;

  const reordered = [...current];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered;
}
