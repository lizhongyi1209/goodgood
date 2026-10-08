import type { CSSProperties } from "react";

export function SeedanceModelIcon({ size = 16 }: Readonly<{ size?: number }>) {
  return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, flexShrink: 0,
    color: "#18181b", backgroundColor: "currentColor", mask: 'url("/model-icons/doubao.svg") center / contain no-repeat',
    WebkitMask: 'url("/model-icons/doubao.svg") center / contain no-repeat' } satisfies CSSProperties} />;
}
