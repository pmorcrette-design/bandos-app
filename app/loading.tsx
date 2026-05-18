import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16">
      <Card className="w-full space-y-6">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-5 w-2/3" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </Card>
    </main>
  );
}
