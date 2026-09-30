import { Zap, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreditIcon({ className, ...props }: LucideProps) {
  return <Zap aria-hidden="true" fill="currentColor" strokeWidth={1} className={cn("credit-icon", className)} {...props} />;
}
