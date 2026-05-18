import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  body,
  action
}: {
  title: string;
  body: string;
  action?: string;
}) {
  return (
    <Card className="border-dashed border-white/10 bg-white/[0.03] text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Inbox className="h-5 w-5 text-mist-200" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-mist-50">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-mist-300">{body}</p>
      {action ? (
        <Button className="mt-5" variant="secondary">
          {action}
        </Button>
      ) : null}
    </Card>
  );
}
