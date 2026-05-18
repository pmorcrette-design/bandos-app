import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.025] p-6 shadow-card backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}
