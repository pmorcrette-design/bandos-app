import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-50 outline-none transition focus:border-coral-500/50 focus:bg-white/[0.07]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";
