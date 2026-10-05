import type { CSSProperties, ImgHTMLAttributes, Ref } from "react";

type PrivateObjectImageProps = Readonly<{
  alt: string;
  className?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  draggable?: ImgHTMLAttributes<HTMLImageElement>["draggable"];
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
  src: string | undefined;
  ref?: Ref<HTMLImageElement>;
  style?: CSSProperties;
}>;

/**
 * Private object URLs are browser-readable blob URLs or short-lived storage
 * signatures. They must bypass the application image optimizer so the server
 * neither proxies user bytes nor rejects an intentional private storage host.
 */
export function PrivateObjectImage({
  alt,
  className,
  loading = "lazy",
  draggable,
  onLoad,
  onError,
  src,
  ref,
  style,
}: PrivateObjectImageProps) {
  return (
    // A native image is intentional for local blobs and expiring signatures.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      className={className}
      decoding="async"
      loading={loading}
      draggable={draggable}
      onLoad={onLoad}
      onError={onError}
      src={src}
      style={style}
    />
  );
}
