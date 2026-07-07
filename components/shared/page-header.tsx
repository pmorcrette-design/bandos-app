import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <Badge tone="accent">{eyebrow}</Badge> : null}
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-mist-50 sm:text-3xl lg:text-[2.15rem]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-mist-300">
          {description}
        </p>
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-3 lg:w-auto">{actions}</div> : null}
    </div>
  );
}
