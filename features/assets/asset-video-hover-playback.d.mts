export type AssetVideoHoverPlayback = Readonly<{
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
}>;

export function attachAssetVideoHoverPlayback(options: Readonly<{
  surface: HTMLElement;
  video: HTMLVideoElement;
  motion: MediaQueryList;
  documentTarget: Document;
  createObserver: (callback: IntersectionObserverCallback, options: IntersectionObserverInit) => IntersectionObserver;
  onPlayingChange: (playing: boolean) => void;
}>): AssetVideoHoverPlayback;
