import assert from "node:assert/strict";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export function defaultLocalProviderTokenFile(environment = process.env) {
  return path.join(
    environment.USERPROFILE ?? environment.HOME ?? "",
    ".claude",
    "goodgood-local-secrets",
    "o1key-api-key.txt",
  );
}

function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export async function resolveLocalProviderTokenFile({
  environment = process.env,
  repositoryRoot,
} = {}) {
  assert.ok(repositoryRoot, "repositoryRoot is required.");
  const configured =
    environment.GOODGOOD_LOCAL_O1KEY_KEY_FILE ??
    defaultLocalProviderTokenFile(environment);
  const resolved = path.resolve(configured);
  const root = path.resolve(repositoryRoot);
  assert.ok(
    !isInside(root, resolved),
    "The real provider token file must live outside the repository.",
  );

  let info;
  try {
    info = await stat(resolved);
  } catch {
    throw new Error(
      `Real provider token file not found at ${resolved}. ` +
        "Write a dedicated development O1Key token there, or set " +
        "GOODGOOD_LOCAL_O1KEY_KEY_FILE to an external file. The development " +
        "runtime does not fall back to mock.",
    );
  }
  if (!info.isFile()) throw new Error(`${resolved} is not a file.`);
  const canonical = await realpath(resolved);
  assert.ok(
    !isInside(root, canonical),
    "The real provider token file must live outside the repository.",
  );
  const token = (await readFile(resolved, "utf8")).trim();
  if (!token) throw new Error(`The real provider token file at ${resolved} is empty.`);
  if (/[\r\n]/.test(token)) {
    throw new Error(
      `The real provider token file at ${resolved} must hold exactly one token.`,
    );
  }
  return resolved;
}
