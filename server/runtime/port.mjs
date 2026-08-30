export function parseRuntimePort(value, fallback, name) {
  const candidate = value === undefined || value === "" ? fallback : Number(value);

  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return candidate;
}
