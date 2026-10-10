/** Development-only presentation data; production always returns false. */
export function homeDemoEnabled(development, requested) {
  return development === true && requested === "true";
}
