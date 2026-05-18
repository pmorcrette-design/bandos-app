import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  change
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-[0.24em] text-mist-300">{label}</p>
      <p className="mt-3 text-[2rem] font-semibold leading-none text-mist-50">{value}</p>
      <p className="mt-3 text-sm text-mist-300">{change}</p>
    </Card>
  );
}
