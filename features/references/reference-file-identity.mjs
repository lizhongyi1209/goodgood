const fingerprints = new WeakMap();
const copies = new WeakSet();

/** File identity is exact bytes; no ready-asset cache crosses authentication. */
export async function referenceFileFingerprint(file) {
  let fingerprint = fingerprints.get(file);
  if (!fingerprint) {
    fingerprint = file.arrayBuffer().then((bytes) => globalThis.crypto.subtle.digest("SHA-256", bytes))
      .then((digest) => [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
    fingerprints.set(file, fingerprint);
    fingerprint.catch(() => { if (fingerprints.get(file) === fingerprint) fingerprints.delete(file); });
  }
  return fingerprint;
}

export function markReferenceFileAsCopy(file) { copies.add(file); return file; }
export function referenceFileCanReuse(file) { return !copies.has(file); }

/** Preserve legacy raw Files; only explicit copies need a local envelope. */
export function storedReferenceFile(file) {
  return referenceFileCanReuse(file) ? file : { file, reuseExisting: false };
}
export function restoredReferenceFile(value) {
  if (!value) return null;
  return value.file ? value.reuseExisting === false ? markReferenceFileAsCopy(value.file) : value.file : value;
}

/** Ready identical IDs collapse; pending/failed entries retain their recovery. */
export function uniqueReadyReferenceItems(items) {
  const seen = new Set();
  const unique = items.filter((item) => {
    if (item.reference.status !== "ready") return true;
    if (seen.has(item.reference.id)) return false;
    seen.add(item.reference.id); return true;
  });
  return unique.length === items.length ? items : unique;
}
