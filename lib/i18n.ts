export type Locale = "fr" | "en";

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "fr";
}

export function t<T>(locale: Locale, fr: T, en: T): T {
  return locale === "fr" ? fr : en;
}

export function translateShowStatus(
  locale: Locale,
  status: "booked" | "pending" | "cancelled" | "local support needed"
) {
  const map = {
    booked: t(locale, "confirmé", "booked"),
    pending: t(locale, "en attente", "pending"),
    cancelled: t(locale, "annulé", "cancelled"),
    "local support needed": t(
      locale,
      "support local requis",
      "local support needed"
    )
  } as const;

  return map[status];
}

export function translateCrmStatus(
  locale: Locale,
  status:
    | "not contacted"
    | "contacted"
    | "replied"
    | "negotiating"
    | "confirmed"
    | "rejected"
) {
  const map = {
    "not contacted": t(locale, "non contacté", "not contacted"),
    contacted: t(locale, "contacté", "contacted"),
    replied: t(locale, "a répondu", "replied"),
    negotiating: t(locale, "négociation", "negotiating"),
    confirmed: t(locale, "confirmé", "confirmed"),
    rejected: t(locale, "refusé", "rejected")
  } as const;

  return map[status];
}

export function translateCrmKind(
  locale: Locale,
  kind: "venue" | "promoter" | "festival" | "booking agent"
) {
  const map = {
    venue: t(locale, "salle", "venue"),
    promoter: t(locale, "promoteur", "promoter"),
    festival: t(locale, "festival", "festival"),
    "booking agent": t(locale, "agent de booking", "booking agent")
  } as const;

  return map[kind];
}

export function translateTaskStatus(
  locale: Locale,
  status: "todo" | "in progress" | "waiting" | "done"
) {
  const map = {
    todo: t(locale, "à faire", "todo"),
    "in progress": t(locale, "en cours", "in progress"),
    waiting: t(locale, "en attente", "waiting"),
    done: t(locale, "terminé", "done")
  } as const;

  return map[status];
}

export function translateTaskPriority(
  locale: Locale,
  priority: "low" | "medium" | "high" | "critical"
) {
  const map = {
    low: t(locale, "faible", "low"),
    medium: t(locale, "moyenne", "medium"),
    high: t(locale, "haute", "high"),
    critical: t(locale, "critique", "critical")
  } as const;

  return map[priority];
}

export function translateTourStatus(
  locale: Locale,
  status: "active" | "planning" | "archived"
) {
  const map = {
    active: t(locale, "active", "active"),
    planning: t(locale, "planification", "planning"),
    archived: t(locale, "archivée", "archived")
  } as const;

  return map[status];
}

export function translateWorkspaceRole(
  locale: Locale,
  role: "owner" | "admin" | "member" | "viewer"
) {
  const map = {
    owner: t(locale, "propriétaire", "owner"),
    admin: t(locale, "admin", "admin"),
    member: t(locale, "membre", "member"),
    viewer: t(locale, "lecture", "viewer")
  } as const;

  return map[role];
}

export function translateBandRole(locale: Locale, role: string) {
  const map: Record<string, string> = {
    vocalist: t(locale, "chant", "vocalist"),
    guitarist: t(locale, "guitare", "guitarist"),
    drummer: t(locale, "batterie", "drummer"),
    bassist: t(locale, "basse", "bassist"),
    manager: t(locale, "manager", "manager"),
    "merch seller": t(locale, "merch", "merch seller"),
    driver: t(locale, "chauffeur", "driver"),
    "tour manager": t(locale, "tour manager", "tour manager"),
    "sound engineer": t(locale, "ingé son", "sound engineer")
  };

  return map[role] ?? role;
}

export function translateProviderService(locale: Locale, service: string) {
  const map: Record<string, string> = {
    "sleeper buses": t(locale, "sleepers", "sleeper buses"),
    drivers: t(locale, "chauffeurs", "drivers"),
    "tour management": t(locale, "tour management", "tour management"),
    "splitter vans": t(locale, "splitter vans", "splitter vans"),
    "self-drive vans": t(locale, "vans sans chauffeur", "self-drive vans"),
    "backline rental": t(locale, "location backline", "backline rental"),
    "merch support": t(locale, "support merch", "merch support")
  };

  return map[service] ?? service;
}

export function translateProviderTag(locale: Locale, tag: string) {
  const map: Record<string, string> = {
    "UK specialist": t(locale, "spécialiste UK", "UK specialist"),
    "EU specialist": t(locale, "spécialiste UE", "EU specialist"),
    "driver included": t(locale, "chauffeur inclus", "driver included"),
    "budget friendly": t(locale, "budget friendly", "budget friendly"),
    "sleeper setup": t(locale, "configuration sleeper", "sleeper setup"),
    "merch support": t(locale, "support merch", "merch support"),
    "B license compatible": t(locale, "compatible permis B", "B license compatible"),
    backline: t(locale, "backline", "backline"),
    festival: t(locale, "festival", "festival"),
    "high capacity": t(locale, "grande capacité", "high capacity"),
    "return room": t(locale, "salle à rejouer", "return room"),
    "local support needed": t(locale, "support local requis", "local support needed"),
    Scotland: t(locale, "Écosse", "Scotland"),
    "repeat promoter": t(locale, "promoteur récurrent", "repeat promoter"),
    agent: t(locale, "agent", "agent"),
    "customs timing": t(locale, "timing douane", "customs timing"),
    "EPK request": t(locale, "demande EPK", "EPK request"),
    "merch friendly": t(locale, "merch friendly", "merch friendly")
  };

  return map[tag] ?? tag;
}

export function translateDocumentCategory(locale: Locale, category: string) {
  const map: Record<string, string> = {
    Contracts: t(locale, "Contrats", "Contracts"),
    Riders: t(locale, "Riders", "Riders"),
    Invoices: t(locale, "Factures", "Invoices"),
    Passports: t(locale, "Passeports", "Passports"),
    "Route Docs": t(locale, "Docs route", "Route Docs"),
    Travel: t(locale, "Voyage", "Travel"),
    Uploaded: t(locale, "Importé", "Uploaded")
  };

  return map[category] ?? category;
}

export function translateFinanceCategory(locale: Locale, category: string) {
  const map: Record<string, string> = {
    "Show Fee": t(locale, "Cachet concert", "Show Fee"),
    "Merch Sales": t(locale, "Ventes merch", "Merch Sales"),
    Fuel: t(locale, "Carburant", "Fuel"),
    Hotels: t(locale, "Hôtels", "Hotels"),
    Ferries: t(locale, "Ferries", "Ferries"),
    Salaries: t(locale, "Salaires", "Salaries"),
    Food: t(locale, "Food", "Food")
  };

  return map[category] ?? category;
}

export function translateFinanceType(locale: Locale, type: "income" | "expense") {
  return type === "income"
    ? t(locale, "revenu", "income")
    : t(locale, "dépense", "expense");
}

export function translateMerchCategory(locale: Locale, category: string) {
  const map: Record<string, string> = {
    Apparel: t(locale, "Textile", "Apparel"),
    Physical: t(locale, "Physique", "Physical"),
    Accessory: t(locale, "Accessoire", "Accessory")
  };

  return map[category] ?? category;
}
