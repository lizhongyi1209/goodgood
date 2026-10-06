export type CanvasVideoPreviewPlayback = Readonly<{
  setHovering: (hovering: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  play: () => void;
  pause: () => void;
  dispose: () => void;
}>;

export function attachCanvasVideoPreviewPlayback(
  video: HTMLVideoElement,
  environment: Readonly<{ page: Document; reducedMotion: MediaQueryList; manualOnly?: boolean }>,
): CanvasVideoPreviewPlayback;
