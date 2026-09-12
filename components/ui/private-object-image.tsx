import type { CSSProperties, ImgHTMLAttributes } from "react";

type PrivateObjectImageProps = Readonly<{
  alt: string;
  className?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  onLoad?: ImgHTMLAttributes<HTMLImageElement>["onLoad"];
  onError?: ImgHTMLAttributes<HTMLImageElement>["onError"];
  src: string;
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
  onLoad,
  onError,
  src,
  style,
}: PrivateObjectImageProps) {
  return (
    // A native image is intentional for local blobs and expiring signatures.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={className}
      decoding="async"
      loading={loading}
      onLoad={onLoad}
      onError={onError}
      src={src}
      style={style}
    />
  );
}
