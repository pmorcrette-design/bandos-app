import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { getLocalePreference } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "BandOS",
  description: "The operating system for bands on tour.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocalePreference();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-coral-500/10 blur-3xl" />
          <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-white/[0.06] blur-3xl" />
        </div>
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
