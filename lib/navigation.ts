import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  CheckSquare,
  Disc3,
  FileText,
  LayoutDashboard,
  Route,
  Settings,
  Shirt,
  Truck,
  Users,
  Wallet,
  Warehouse
} from "lucide-react";

import { t, type Locale } from "@/lib/i18n";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
};

const navigationDefinitions: Array<
  Omit<NavigationItem, "label"> & {
    labelFr: string;
    labelEn: string;
  }
> = [
  {
    href: "/app",
    labelFr: "Tableau de bord",
    labelEn: "Dashboard",
    icon: LayoutDashboard,
    shortcut: "G D"
  },
  {
    href: "/app/tours",
    labelFr: "Tournées",
    labelEn: "Tours",
    icon: Route,
    shortcut: "G T"
  },
  {
    href: "/app/shows",
    labelFr: "Concerts",
    labelEn: "Shows",
    icon: Warehouse,
    shortcut: "G S"
  },
  {
    href: "/app/booking-crm",
    labelFr: "CRM booking",
    labelEn: "Booking CRM",
    icon: BriefcaseBusiness,
    shortcut: "G B"
  },
  {
    href: "/app/tour-services",
    labelFr: "Vans // Drivers",
    labelEn: "Vans // Drivers",
    icon: Truck,
    shortcut: "G V"
  },
  {
    href: "/app/finance",
    labelFr: "Finance",
    labelEn: "Finance",
    icon: Wallet,
    shortcut: "G F"
  },
  {
    href: "/app/merch",
    labelFr: "Merch",
    labelEn: "Merch",
    icon: Shirt,
    shortcut: "G M"
  },
  {
    href: "/app/epk",
    labelFr: "EPK",
    labelEn: "EPK",
    icon: Disc3,
    shortcut: "G E"
  },
  {
    href: "/app/documents",
    labelFr: "Documents",
    labelEn: "Documents",
    icon: FileText,
    shortcut: "G O"
  },
  {
    href: "/app/tasks",
    labelFr: "Tâches",
    labelEn: "Tasks",
    icon: CheckSquare,
    shortcut: "G K"
  },
  {
    href: "/app/team",
    labelFr: "Équipe",
    labelEn: "Team",
    icon: Users,
    shortcut: "G U"
  },
  {
    href: "/app/settings",
    labelFr: "Réglages",
    labelEn: "Settings",
    icon: Settings,
    shortcut: "G ,"
  }
];

export function getNavigationItems(locale: Locale): NavigationItem[] {
  return navigationDefinitions.map(({ labelFr, labelEn, ...item }) => ({
    ...item,
    label: t(locale, labelFr, labelEn)
  }));
}
