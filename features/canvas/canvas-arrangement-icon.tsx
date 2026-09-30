const alignmentPaths = {
  left: ["M5 4v16", "M10 8h10M10 16h6"],
  "center-x": ["M12 4v16", "M7 8h10M9 16h6"],
  right: ["M19 4v16", "M4 8h10M8 16h6"],
  top: ["M4 5h16", "M8 10v10M16 10v6"],
  "center-y": ["M4 12h16", "M8 7v10M16 9v6"],
  bottom: ["M4 19h16", "M8 4v10M16 8v6"],
} as const;

export function CanvasArrangementIcon({ action }: Readonly<{
  action: keyof typeof alignmentPaths | "tidy";
}>) {
  const paths = action === "tidy" ? null : alignmentPaths[action];
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {paths ? <>
        <path d={paths[0]} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
        <path d={paths[1]} stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" />
      </> : <g fill="currentColor">
        <rect x={4} y={4} width={6} height={6} rx={1.2} />
        <rect x={14} y={4} width={6} height={6} rx={1.2} />
        <rect x={4} y={14} width={6} height={6} rx={1.2} />
        <rect x={14} y={14} width={6} height={6} rx={1.2} />
      </g>}
    </svg>
  );
}
