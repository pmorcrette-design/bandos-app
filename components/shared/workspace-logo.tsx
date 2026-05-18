import Image from "next/image";

import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-10 w-10 rounded-2xl",
  md: "h-12 w-12 rounded-[20px]",
  lg: "h-20 w-20 rounded-[28px]"
} as const;

export function WorkspaceLogo({
  src = "/widespread-disease-logo.jpg",
  alt = "Widespread Disease logo",
  size = "md",
  className,
  priority = false
}: {
  src?: string;
  alt?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/10 bg-white/[0.96] shadow-card ring-1 ring-black/10",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={
          size === "lg"
            ? "(max-width: 1024px) 80px, 80px"
            : "(max-width: 1024px) 48px, 48px"
        }
        className="object-contain p-1"
      />
    </div>
  );
}
