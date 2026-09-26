import Link from "next/link";

import { Button } from "@/components/ui/button";

export type CtaProps = Readonly<{
  ctaEnabled: boolean;
  text: string;
  link: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}>;

export function Cta({ cta }: Readonly<{ cta: CtaProps }>) {
  if (!cta.ctaEnabled) return null;

  const { text, link, variant = "default", size = "default" } = cta;
  if (!link.trim()) return <Button type="button" variant={variant} size={size} disabled>{text}</Button>;

  return <Button variant={variant} size={size} asChild><Link href={link}>{text}</Link></Button>;
}
