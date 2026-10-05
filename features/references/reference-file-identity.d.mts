export function referenceFileFingerprint(file: File): Promise<string>;
export function markReferenceFileAsCopy<T extends File>(file: T): T;
export function referenceFileCanReuse(file: File): boolean;
export function storedReferenceFile(file: File): File | { file: File; reuseExisting: false };
export function restoredReferenceFile(value: File | { file: File; reuseExisting?: boolean } | null): File | null;
export function uniqueReadyReferenceItems<T extends { reference: { id: string; status: string } }>(items: T[]): T[];
