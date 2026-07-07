export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ShowStatus =
  | "booked"
  | "pending"
  | "cancelled"
  | "local support needed";
export type CrmStatus =
  | "not contacted"
  | "contacted"
  | "replied"
  | "negotiating"
  | "confirmed"
  | "rejected";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  workspaceRole: WorkspaceRole;
  location: string;
  focus: string;
  initials: string;
};

export type TourStop = {
  city: string;
  country: string;
  date: string;
  venue: string;
  address?: string;
  distanceKm: number;
  status: ShowStatus;
};

export type Tour = {
  id: string;
  name: string;
  region: string;
  dateRange: string;
  status: "active" | "planning" | "archived";
  distanceKm: number;
  fuel: number;
  tolls: number;
  ferries: number;
  hotels: number;
  driver: string;
  van: string;
  servicesProvider: string;
  passengerCapacity: number;
  sleepingCapacity: number;
  merchCapacity: string;
  borderReadiness: number;
  notes: string;
  stops: TourStop[];
};

export type Show = {
  id: string;
  date: string;
  city: string;
  country: string;
  venue: string;
  promoter: string;
  address: string;
  loadIn: string;
  soundcheck: string;
  setTime: string;
  curfew: string;
  fee: string;
  doorSplit: string;
  capacity: number;
  ticketPrice: number;
  roomHire: number;
  projectedAttendance: number;
  lineup: string[];
  parking: string;
  sleeping: string;
  hospitality: string;
  contacts: {
    name: string;
    title: string;
    email: string;
    phone: string;
  }[];
  notes: string;
  attachedFiles: string[];
  status: ShowStatus;
  supportNeeded: boolean;
  dealHistory: string;
  routeNote: string;
};

export type CrmContact = {
  id: string;
  company: string;
  kind: "venue" | "promoter" | "festival" | "booking agent" | "band";
  email: string;
  phone: string;
  instagram: string;
  capacity: number;
  city: string;
  country: string;
  dealHistory: string;
  previousShows: string;
  notes: string;
  status: CrmStatus;
  lastContact: string;
  tags: string[];
  roomHire: number | null;
  defaultFee: number | null;
};

export type Provider = {
  id: string;
  name: string;
  country: string;
  city: string;
  fleetSize: number;
  services: string[];
  contact: string;
  website: string;
  estimatedDailyPrice: number;
  tags: string[];
  rating: number;
  notes: string;
  assignedTourId?: string;
  passengerCapacity: number;
  sleepingCapacity: number;
  merchCapacity: string;
  quoteFiles: string[];
};

export type FinanceEntry = {
  id: string;
  type: "income" | "expense";
  category: string;
  label: string;
  amount: number;
  currency: "GBP" | "EUR";
  date: string;
};

export type MerchProductType =
  | "t-shirt"
  | "hoodie"
  | "longsleeve"
  | "patch"
  | "poster"
  | "vinyl"
  | "cd"
  | "other";

export type MerchProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  productType: MerchProductType;
  designId: string | null;
  color: string;
  supplier: string;
  variants: string[];
  sizes: string[];
  sizeBreakdown: Array<{
    size: string;
    remaining: number;
  }>;
  initialStock: number;
  stock: number;
  sold: number;
  purchasePrice: number;
  salePrice: number;
  revenue: number;
  reorderPoint: number;
  alert: string | null;
  location: string;
  lastRestockDate: string;
  sumupCatalogName: string;
  sumupSku: string | null;
};

export type TaskItem = {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  priority: TaskPriority;
  status: "todo" | "in progress" | "waiting" | "done";
  comments: number;
  attachments: number;
};

export type WorkspaceDocument = {
  id: string;
  name: string;
  category: string;
  tour: string;
  show: string;
  updatedAt: string;
  owner: string;
};

export type RoutePoint = {
  id: string;
  city: string;
  country: string;
  venue: string;
  date: string;
  address: string;
  distanceKm: number;
  status: ShowStatus;
  label: string;
};

export const workspaceProfile = {
  name: "WIDESPREAD DISEASE",
  genre: "Deathcore",
  country: "France",
  plan: "Touring",
  nextShowDate: "2026-05-23",
  activeTourId: "northbound-ruin",
  logo: "/widespread-disease-logo.jpg"
};

export const trustedBands = [
  {
    name: "widespread disease",
    logo: "/widespread-disease-logo.jpg"
  }
];

export const landingProblems = [
  {
    title: "Tour plans live in six different tools",
    body:
      "Band chats, spreadsheets, contracts, riders, route notes, and finance updates all fragment once the run starts moving."
  },
  {
    title: "Show details disappear right before doors",
    body:
      "Load-in times, parking instructions, merch cuts, border notes, and contacts get buried when the stakes are highest."
  },
  {
    title: "No one owns the operating picture",
    body:
      "Managers, members, labels, and drivers need one live source of truth that is built for touring logistics, not general docs."
  }
];

export const featureCards = [
  {
    title: "Tour Builder",
    body:
      "Build routes, estimate fuel and tolls, assign vans, attach hotels, and keep every stop aligned to the same operating plan."
  },
  {
    title: "Booking CRM",
    body:
      "Track venues, promoters, agents, follow-ups, tags, and deal history with a real pipeline instead of a patchwork spreadsheet."
  },
  {
    title: "Tour Services",
    body:
      "Keep vetted transport, backline, merch, and tour support providers in one premium sourcing workspace."
  },
  {
    title: "Finance and Merch",
    body:
      "Watch tour P&L, merch velocity, member splits, cash burn, and export-ready numbers without waiting for after-tour cleanup."
  },
  {
    title: "Advance Generator",
    body:
      "Auto-assemble stage plots, input lists, rider notes, contacts, parking, and schedules into a clean show pack."
  },
  {
    title: "Travel Docs",
    body:
      "Keep passports, ATA carnet, passenger lists, insurance, van docs, and customs notes inside one practical touring checklist."
  }
];

export const workflowSteps = [
  {
    title: "Build the run",
    body:
      "Create the tour, stack shows, assign the van, map routing, and lock transport assumptions before deposits start moving."
  },
  {
    title: "Advance every room",
    body:
      "Push show-day details into one place with contacts, hospitality, backline, parking, sleeping, and set schedules."
  },
  {
    title: "Operate live",
    body:
      "Track route changes, cash flow, merch performance, team tasks, and travel-document readiness while the band is actually moving."
  },
  {
    title: "Close cleanly",
    body:
      "Export reports, reconcile splits, capture provider notes, and carry every booking signal into the next cycle."
  }
];

export const testimonials = [
  {
    quote:
      "BandOS finally gives Widespread Disease one operating picture instead of fragmented chats, notes, and last-minute searches.",
    author: "Rina Vale",
    title: "Tour Manager, Widespread Disease"
  },
  {
    quote:
      "The route plan, show details, merch counts, and deal notes now live in one place the whole band can actually use.",
    author: "Joel Mercer",
    title: "Booking, Widespread Disease"
  },
  {
    quote:
      "Having the travel docs, van paperwork, and advance info in one workspace makes loading out and moving to the next city much calmer.",
    author: "Mae Hollow",
    title: "Operations, Widespread Disease"
  }
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "£29",
    description: "For DIY bands preparing their first serious runs.",
    features: ["1 workspace", "3 active tours", "Finance + merch basics", "Core docs"]
  },
  {
    name: "Touring",
    price: "£99",
    description: "For active bands, tour managers, and booking teams.",
    features: [
      "Unlimited tours",
      "Booking CRM",
      "Advance generator",
      "Tour services directory"
    ],
    featured: true
  },
  {
    name: "Label",
    price: "Custom",
    description: "For labels, agencies, and roster operations teams.",
    features: ["Multi-workspace controls", "Custom exports", "Shared vendor notes", "Priority support"]
  }
];

export const faqs = [
  {
    question: "Is BandOS built for fans or fan clubs?",
    answer:
      "No. BandOS is an internal operating workspace for touring logistics, bookings, finance, merch, and documents."
  },
  {
    question: "Can labels and booking agents share the same workspace?",
    answer:
      "Yes. Roles and isolated workspaces let owners invite managers, labels, agents, and crew into the right operational view."
  },
  {
    question: "Does it support travel documents and cross-border touring?",
    answer:
      "Yes. The product includes travel-document workflows, passenger lists, van documents, merch declaration checks, and customs notes when a route needs them."
  },
  {
    question: "Can we export finance or show packs?",
    answer:
      "Yes. The UI includes export-ready finance CSV workflows and clean advance pack outputs designed for PDF or shareable links."
  }
];

export const dashboardStats = [
  {
    label: "Merch Revenue",
    value: "£4.8k",
    change: "+18% vs last run"
  },
  {
    label: "Tour Expenses",
    value: "£2.6k",
    change: "Fuel and hotels synced"
  },
  {
    label: "Pending Confirmations",
    value: "6",
    change: "2 need promoter replies"
  },
  {
    label: "Unread Tasks",
    value: "9",
    change: "3 due within 48h"
  }
];

export const routeOverview = [
  { city: "London", country: "UK", distance: "0 km", note: "Launch date" },
  { city: "Manchester", country: "UK", distance: "335 km", note: "Driver swap" },
  { city: "Glasgow", country: "UK", distance: "346 km", note: "Sleep bus hotel split" },
  { city: "Sheffield", country: "UK", distance: "365 km", note: "Merch restock" }
];

export const recentActivity = [
  "The Black Heart advance pack updated with parking gate code",
  "Merch batch count synced after Bristol pop-up",
  "Nomads of Prague quote attached to Northbound Ruin",
  "Promoter at The Peer Hat replied with local support ask"
];

export const upcomingDeadlines = [
  "Upload carnet serials before Dover departure",
  "Confirm sleeping split in Glasgow by Tuesday",
  "Send revised hospitality rider to The Peer Hat",
  "Approve sleeper van deposit before 18:00"
];

export const tours: Tour[] = [
  {
    id: "northbound-ruin",
    name: "Northbound Ruin 2026",
    region: "UK / EU",
    dateRange: "23 May - 2 Jun",
    status: "active",
    distanceKm: 1480,
    fuel: 620,
    tolls: 180,
    ferries: 260,
    hotels: 960,
    driver: "Amina Solberg",
    van: "Nightliner 6",
    servicesProvider: "Nomads of Prague",
    passengerCapacity: 7,
    sleepingCapacity: 6,
    merchCapacity: "3 flight cases",
    borderReadiness: 82,
    notes:
      "Sleeper route with mixed venues. ATA carnet almost complete. Merch declaration draft ready for EU entry.",
    stops: [
      {
        city: "London",
        country: "UK",
        date: "2026-05-23",
        venue: "The Black Heart",
        address: "3 Greenland Place, Camden Town, London",
        distanceKm: 0,
        status: "booked"
      },
      {
        city: "Manchester",
        country: "UK",
        date: "2026-05-25",
        venue: "The Peer Hat",
        address: "14-16 Faraday Street, Manchester",
        distanceKm: 335,
        status: "local support needed"
      },
      {
        city: "Glasgow",
        country: "UK",
        date: "2026-05-27",
        venue: "Audio",
        address: "14 Midland Street, Glasgow",
        distanceKm: 346,
        status: "booked"
      },
      {
        city: "Sheffield",
        country: "UK",
        date: "2026-05-29",
        venue: "Corporation",
        address: "2 Milton Street, Sheffield",
        distanceKm: 365,
        status: "pending"
      }
    ]
  },
  {
    id: "ash-and-arteries",
    name: "Ash & Arteries Weekenders",
    region: "Northern Europe",
    dateRange: "14 Jun - 17 Jun",
    status: "planning",
    distanceKm: 920,
    fuel: 420,
    tolls: 140,
    ferries: 220,
    hotels: 680,
    driver: "Luca Haines",
    van: "Flint Transit",
    servicesProvider: "Beat The Street",
    passengerCapacity: 5,
    sleepingCapacity: 4,
    merchCapacity: "2 road cases",
    borderReadiness: 54,
    notes:
      "Routing still open around Rotterdam and Cologne. Need to lock self-drive van and hotel holds.",
    stops: [
      {
        city: "Rotterdam",
        country: "NL",
        date: "2026-06-14",
        venue: "Baroeg",
        address: "Spinozaweg 300, Rotterdam",
        distanceKm: 0,
        status: "pending"
      },
      {
        city: "Cologne",
        country: "DE",
        date: "2026-06-15",
        venue: "Helios37",
        address: "Heliosstraße 37, Cologne",
        distanceKm: 265,
        status: "pending"
      }
    ]
  }
];

export const shows: Show[] = [
  {
    id: "the-black-heart",
    date: "2026-05-23",
    city: "London",
    country: "UK",
    venue: "The Black Heart",
    promoter: "Ashline Presents",
    address: "3 Greenland Place, Camden Town, London",
    loadIn: "16:00",
    soundcheck: "17:30",
    setTime: "21:10",
    curfew: "23:00",
    fee: "£150 guarantee",
    doorSplit: "70/30 door split",
    capacity: 150,
    ticketPrice: 14,
    roomHire: 240,
    projectedAttendance: 118,
    lineup: ["Widespread Disease", "Mourning Relay"],
    parking: "Back alley load gate. Call venue 20 min before arrival.",
    sleeping: "No floor space. Hotel block at Premier Inn Camden.",
    hospitality: "6 hot meals, 24 waters, vegan option, towels.",
    contacts: [
      {
        name: "Nadia Bloom",
        title: "Promoter",
        email: "nadia@ashline.co",
        phone: "+44 20 5551 1032"
      },
      {
        name: "Kieran Moss",
        title: "Venue Manager",
        email: "ops@theblackheart.co.uk",
        phone: "+44 20 5551 8870"
      }
    ],
    notes:
      "Merch cut included after first 25 tickets. House DI available. Drum rug requested in advance.",
    attachedFiles: ["contract-black-heart.pdf", "advance-pack-london.pdf"],
    status: "booked",
    supportNeeded: false,
    dealHistory: "First date with promoter. Positive ticket growth on pre-sales.",
    routeNote: "Van stays in Camden secure lot overnight."
  },
  {
    id: "the-peer-hat",
    date: "2026-05-25",
    city: "Manchester",
    country: "UK",
    venue: "The Peer Hat",
    promoter: "Northline Shows",
    address: "14-16 Faraday Street, Manchester",
    loadIn: "15:00",
    soundcheck: "17:00",
    setTime: "20:45",
    curfew: "22:45",
    fee: "£100 guarantee",
    doorSplit: "70/30 door split + merch cut included",
    capacity: 120,
    ticketPrice: 12,
    roomHire: 210,
    projectedAttendance: 76,
    lineup: ["Widespread Disease", "Static Chapel"],
    parking: "Street unload only. Van moved to NCP Shudehill after load-in.",
    sleeping: "4 promoter floor spots, 2 hotel reimbursements.",
    hospitality: "8 meals, coffee, fruit, 1 crate of water.",
    contacts: [
      {
        name: "Harvey Pike",
        title: "Promoter",
        email: "harvey@northline.live",
        phone: "+44 161 555 0189"
      }
    ],
    notes:
      "Local support needed. Promoter requested assets in square and portrait ratios.",
    attachedFiles: ["peer-hat-deal-memo.pdf"],
    status: "local support needed",
    supportNeeded: true,
    dealHistory: "Second show with promoter. Last event drew 86 paid.",
    routeNote: "Swap to driver Luca after M6 services stop."
  },
  {
    id: "audio-glasgow",
    date: "2026-05-27",
    city: "Glasgow",
    country: "UK",
    venue: "Audio",
    promoter: "Riot North",
    address: "14 Midland Street, Glasgow",
    loadIn: "16:30",
    soundcheck: "18:00",
    setTime: "21:30",
    curfew: "23:00",
    fee: "£250 guarantee",
    doorSplit: "85/15 after house costs",
    capacity: 250,
    ticketPrice: 16,
    roomHire: 320,
    projectedAttendance: 186,
    lineup: ["Widespread Disease", "No Sleep District", "Ashline"],
    parking: "Bus bay access from service lane after 15:45.",
    sleeping: "Travelodge city centre, 3 twin rooms.",
    hospitality: "6 hot meals, 2 parking passes, towels, tea station.",
    contacts: [
      {
        name: "Sofia Reed",
        title: "Promoter",
        email: "sofia@riotnorth.uk",
        phone: "+44 141 555 2290"
      }
    ],
    notes:
      "Strong merch night expected. Add low-stock alert for longsleeves before departure.",
    attachedFiles: ["glasgow-room-spec.pdf"],
    status: "booked",
    supportNeeded: false,
    dealHistory: "Best grossing Scottish market in last 12 months.",
    routeNote: "Hotel parking height limit is 2.1m, van clears."
  },
  {
    id: "corporation-sheffield",
    date: "2026-05-29",
    city: "Sheffield",
    country: "UK",
    venue: "Corporation",
    promoter: "Steel City Bookings",
    address: "2 Milton Street, Sheffield",
    loadIn: "15:30",
    soundcheck: "17:15",
    setTime: "20:50",
    curfew: "23:00",
    fee: "Pending confirmation",
    doorSplit: "Pending final deal",
    capacity: 300,
    ticketPrice: 13,
    roomHire: 450,
    projectedAttendance: 92,
    lineup: ["Widespread Disease", "TBA"],
    parking: "Rear dock access once final confirmation lands.",
    sleeping: "Pending promoter response.",
    hospitality: "Pending final advance.",
    contacts: [
      {
        name: "Liam Cross",
        title: "Promoter",
        email: "liam@steelcitybookings.com",
        phone: "+44 114 555 9401"
      }
    ],
    notes: "Need confirmation on fee, floor package, and house engineer.",
    attachedFiles: ["sheffield-offer-thread.pdf"],
    status: "pending",
    supportNeeded: true,
    dealHistory: "First hold converted from festival lead.",
    routeNote: "Potential merch restock pickup before departure."
  }
];

export const crmContacts: CrmContact[] = [
  {
    id: "crm-black-heart",
    company: "The Black Heart",
    kind: "venue",
    email: "ops@theblackheart.co.uk",
    phone: "+44 20 5551 8870",
    instagram: "@theblackheart",
    capacity: 150,
    city: "London",
    country: "UK",
    dealHistory: "£150 guarantee",
    previousShows: "1 hold, 1 confirmed",
    notes: "Fast replies, merch-friendly room.",
    status: "confirmed",
    lastContact: "2026-05-11",
    tags: ["UK specialist", "merch friendly", "return room"],
    roomHire: 250,
    defaultFee: null
  },
  {
    id: "crm-peer-hat",
    company: "The Peer Hat",
    kind: "venue",
    email: "hello@thepeerhat.co.uk",
    phone: "+44 161 555 7812",
    instagram: "@thepeerhat",
    capacity: 120,
    city: "Manchester",
    country: "UK",
    dealHistory: "70/30 door split",
    previousShows: "1 previous show",
    notes: "Needs earlier marketing push and local support lock.",
    status: "negotiating",
    lastContact: "2026-05-14",
    tags: ["local support needed", "return room"],
    roomHire: 180,
    defaultFee: null
  },
  {
    id: "crm-riot-north",
    company: "Riot North",
    kind: "promoter",
    email: "sofia@riotnorth.uk",
    phone: "+44 141 555 2290",
    instagram: "@riotnorthshows",
    capacity: 0,
    city: "Glasgow",
    country: "UK",
    dealHistory: "£250 guarantee",
    previousShows: "2 previous runs",
    notes: "Reliable settlements, strong walk-up audience.",
    status: "confirmed",
    lastContact: "2026-05-15",
    tags: ["Scotland", "repeat promoter"],
    roomHire: null,
    defaultFee: null
  },
  {
    id: "crm-malko",
    company: "Malko Touring",
    kind: "booking agent",
    email: "bookings@malkotouring.eu",
    phone: "+420 555 220 771",
    instagram: "@malkotouring",
    capacity: 0,
    city: "Prague",
    country: "CZ",
    dealHistory: "Routing inquiry",
    previousShows: "No previous show history",
    notes: "Strong central EU routing contacts.",
    status: "replied",
    lastContact: "2026-05-08",
    tags: ["EU specialist", "agent"],
    roomHire: null,
    defaultFee: null
  },
  {
    id: "crm-bloodstock",
    company: "Bloodline Weekender",
    kind: "festival",
    email: "talent@bloodlinefest.com",
    phone: "+44 121 555 1934",
    instagram: "@bloodlinefest",
    capacity: 5000,
    city: "Derbyshire",
    country: "UK",
    dealHistory: "Offer under review",
    previousShows: "Festival contact only",
    notes: "Need availability hold through July.",
    status: "contacted",
    lastContact: "2026-05-13",
    tags: ["festival", "high capacity"],
    roomHire: null,
    defaultFee: null
  },
  {
    id: "crm-helio",
    company: "Helios37",
    kind: "venue",
    email: "shows@helios37.de",
    phone: "+49 221 555 612",
    instagram: "@helios37",
    capacity: 350,
    city: "Cologne",
    country: "DE",
    dealHistory: "Soft hold only",
    previousShows: "No history",
    notes: "Needs tighter routing proposal and customs timing.",
    status: "contacted",
    lastContact: "2026-05-03",
    tags: ["EU specialist", "customs timing"],
    roomHire: 520,
    defaultFee: null
  },
  {
    id: "crm-baroeg",
    company: "Baroeg",
    kind: "venue",
    email: "talent@baroeg.nl",
    phone: "+31 10 555 1782",
    instagram: "@baroegrotterdam",
    capacity: 300,
    city: "Rotterdam",
    country: "NL",
    dealHistory: "Offer pending",
    previousShows: "No history",
    notes: "Promoter asked for streaming stats and EPK refresh.",
    status: "replied",
    lastContact: "2026-05-09",
    tags: ["EU specialist", "EPK request"],
    roomHire: 480,
    defaultFee: null
  }
];

export const tourProviders: Provider[] = [
  {
    id: "provider-nomads",
    name: "Nomads of Prague",
    country: "Czech Republic",
    city: "Prague",
    fleetSize: 12,
    services: ["sleeper buses", "drivers", "tour management"],
    contact: "ops@nomadsofprague.eu",
    website: "nomadsofprague.eu",
    estimatedDailyPrice: 680,
    tags: ["EU specialist", "driver included", "sleeper setup"],
    rating: 4.9,
    notes: "Best fit for UK/EU hybrid runs with border support.",
    assignedTourId: "northbound-ruin",
    passengerCapacity: 7,
    sleepingCapacity: 6,
    merchCapacity: "3 flight cases",
    quoteFiles: ["nomads-quote-q2.pdf", "sleeper-layout-v2.pdf"]
  },
  {
    id: "provider-beat",
    name: "Beat The Street",
    country: "United Kingdom",
    city: "Leeds",
    fleetSize: 8,
    services: ["splitter vans", "self-drive vans", "drivers"],
    contact: "routing@beatthestreet.uk",
    website: "beatthestreet.uk",
    estimatedDailyPrice: 420,
    tags: ["UK specialist", "budget friendly", "B license compatible"],
    rating: 4.7,
    notes: "Strong value on UK weekenders and short merch runs.",
    passengerCapacity: 5,
    sleepingCapacity: 0,
    merchCapacity: "2 road cases",
    quoteFiles: ["beatthestreet-q1.pdf"]
  },
  {
    id: "provider-ibex",
    name: "IBEX Touring",
    country: "Germany",
    city: "Cologne",
    fleetSize: 16,
    services: ["sleeper buses", "backline rental", "drivers"],
    contact: "dispatch@ibextouring.de",
    website: "ibextouring.de",
    estimatedDailyPrice: 760,
    tags: ["EU specialist", "driver included", "backline"],
    rating: 4.8,
    notes: "Premium fleet and late-call reliability.",
    passengerCapacity: 8,
    sleepingCapacity: 8,
    merchCapacity: "4 cases + drums",
    quoteFiles: ["ibex-sleeper-2026.pdf"]
  },
  {
    id: "provider-rockingowl",
    name: "Rocking Owl",
    country: "Netherlands",
    city: "Utrecht",
    fleetSize: 5,
    services: ["self-drive vans", "merch support"],
    contact: "hello@rockingowl.nl",
    website: "rockingowl.nl",
    estimatedDailyPrice: 360,
    tags: ["EU specialist", "budget friendly", "merch support"],
    rating: 4.5,
    notes: "Smaller fleet but flexible on late bookings.",
    passengerCapacity: 6,
    sleepingCapacity: 0,
    merchCapacity: "3 soft bags",
    quoteFiles: []
  },
  {
    id: "provider-fluffwheels",
    name: "Fluffwheels",
    country: "Belgium",
    city: "Brussels",
    fleetSize: 7,
    services: ["drivers", "splitter vans", "tour management"],
    contact: "ops@fluffwheels.be",
    website: "fluffwheels.be",
    estimatedDailyPrice: 510,
    tags: ["driver included", "EU specialist"],
    rating: 4.6,
    notes: "Good dispatcher comms and cross-border paperwork habits.",
    passengerCapacity: 7,
    sleepingCapacity: 0,
    merchCapacity: "2 cases + banner trunk",
    quoteFiles: ["fluffwheels-driver-only.pdf"]
  },
  {
    id: "provider-mm",
    name: "MM Band Services",
    country: "United Kingdom",
    city: "Birmingham",
    fleetSize: 10,
    services: ["backline rental", "drivers", "merch support"],
    contact: "desk@mmbandservices.co.uk",
    website: "mmbandservices.co.uk",
    estimatedDailyPrice: 480,
    tags: ["UK specialist", "merch support"],
    rating: 4.4,
    notes: "Useful when the room package is thin and flyouts need backline.",
    passengerCapacity: 4,
    sleepingCapacity: 0,
    merchCapacity: "1 van trunk + trailer",
    quoteFiles: ["mm-backline-menu.pdf"]
  }
];

export const financeEntries: FinanceEntry[] = [
  {
    id: "finance-1",
    type: "income",
    category: "Show Fee",
    label: "The Black Heart guarantee",
    amount: 150,
    currency: "GBP",
    date: "2026-05-23"
  },
  {
    id: "finance-2",
    type: "income",
    category: "Merch Sales",
    label: "Bristol pop-up revenue",
    amount: 1180,
    currency: "GBP",
    date: "2026-05-16"
  },
  {
    id: "finance-3",
    type: "expense",
    category: "Fuel",
    label: "Shell M1 services",
    amount: 210,
    currency: "GBP",
    date: "2026-05-15"
  },
  {
    id: "finance-4",
    type: "expense",
    category: "Hotels",
    label: "Premier Inn Camden hold",
    amount: 390,
    currency: "GBP",
    date: "2026-05-18"
  },
  {
    id: "finance-5",
    type: "expense",
    category: "Ferries",
    label: "Eurotunnel return hold",
    amount: 260,
    currency: "GBP",
    date: "2026-05-19"
  },
  {
    id: "finance-6",
    type: "expense",
    category: "Salaries",
    label: "Tour manager advance",
    amount: 300,
    currency: "GBP",
    date: "2026-05-17"
  },
  {
    id: "finance-7",
    type: "expense",
    category: "Food",
    label: "Crew per diem top-up",
    amount: 120,
    currency: "GBP",
    date: "2026-05-17"
  }
];

export const merchProducts: MerchProduct[] = [
  {
    id: "merch-tee-black",
    sku: "WD-TEE-TOUR-2026",
    name: "Widespread Disease Tour Tee",
    category: "Apparel",
    productType: "t-shirt",
    designId: "design-concrete-sigil",
    color: "Black",
    supplier: "Night Shift Print Co.",
    variants: ["Black", "Stone"],
    sizes: ["S", "M", "L", "XL"],
    sizeBreakdown: [
      { size: "S", remaining: 14 },
      { size: "M", remaining: 24 },
      { size: "L", remaining: 28 },
      { size: "XL", remaining: 26 }
    ],
    initialStock: 240,
    stock: 92,
    sold: 148,
    purchasePrice: 7,
    salePrice: 20,
    revenue: 2960,
    reorderPoint: 60,
    alert: null,
    location: "Van Case A",
    lastRestockDate: "2026-05-08",
    sumupCatalogName: "Tour Tee",
    sumupSku: null
  },
  {
    id: "merch-longsleeve",
    sku: "WD-LS-NORTHBOUND",
    name: "Northbound Longsleeve",
    category: "Apparel",
    productType: "longsleeve",
    designId: "design-ashes-route",
    color: "Washed Charcoal",
    supplier: "Night Shift Print Co.",
    variants: ["Washed Charcoal"],
    sizes: ["M", "L", "XL"],
    sizeBreakdown: [
      { size: "M", remaining: 6 },
      { size: "L", remaining: 7 },
      { size: "XL", remaining: 5 }
    ],
    initialStock: 85,
    stock: 18,
    sold: 67,
    purchasePrice: 11,
    salePrice: 25,
    revenue: 1675,
    reorderPoint: 24,
    alert: "Low stock alert",
    location: "Van Case B",
    lastRestockDate: "2026-05-02",
    sumupCatalogName: "Northbound Longsleeve",
    sumupSku: null
  },
  {
    id: "merch-vinyl",
    sku: "WD-SPLIT12-SEASMOKE",
    name: "Widespread Disease Split 12\"",
    category: "Physical",
    productType: "vinyl",
    designId: "design-logo-evergreen",
    color: "Sea Smoke",
    supplier: "Cold Harbour Pressing",
    variants: ["Sea Smoke"],
    sizes: ["N/A"],
    sizeBreakdown: [{ size: "N/A", remaining: 34 }],
    initialStock: 88,
    stock: 34,
    sold: 54,
    purchasePrice: 8,
    salePrice: 20,
    revenue: 1080,
    reorderPoint: 20,
    alert: null,
    location: "Merch Trunk",
    lastRestockDate: "2026-04-28",
    sumupCatalogName: "Split 12 Vinyl",
    sumupSku: null
  },
  {
    id: "merch-patch",
    sku: "WD-PATCH-RED-BONE",
    name: "BandOS Patch Mock",
    category: "Accessory",
    productType: "patch",
    designId: "design-logo-evergreen",
    color: "Red / Bone",
    supplier: "Dead Thread Embroidery",
    variants: ["Red / Bone"],
    sizes: ["N/A"],
    sizeBreakdown: [{ size: "N/A", remaining: 12 }],
    initialStock: 107,
    stock: 12,
    sold: 95,
    purchasePrice: 1,
    salePrice: 5,
    revenue: 475,
    reorderPoint: 30,
    alert: "Reorder before Glasgow",
    location: "Drawer Pouch",
    lastRestockDate: "2026-04-20",
    sumupCatalogName: "Logo Patch",
    sumupSku: null
  }
];

export const tasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Advance The Peer Hat with updated poster sizes",
    assignee: "Mae Hollow",
    deadline: "2026-05-18",
    priority: "high",
    status: "in progress",
    comments: 6,
    attachments: 2
  },
  {
    id: "task-2",
    title: "Upload ATA carnet serials and merch declaration",
    assignee: "Alex Mercer",
    deadline: "2026-05-19",
    priority: "critical",
    status: "todo",
    comments: 4,
    attachments: 3
  },
  {
    id: "task-3",
    title: "Lock Glasgow hotel rooming list",
    assignee: "Rina Vale",
    deadline: "2026-05-20",
    priority: "medium",
    status: "waiting",
    comments: 2,
    attachments: 1
  },
  {
    id: "task-4",
    title: "Restock longsleeves before Sheffield",
    assignee: "Dani Croft",
    deadline: "2026-05-26",
    priority: "high",
    status: "todo",
    comments: 1,
    attachments: 0
  },
  {
    id: "task-5",
    title: "Send revised input list to London FOH",
    assignee: "Jonah Pike",
    deadline: "2026-05-18",
    priority: "medium",
    status: "done",
    comments: 3,
    attachments: 1
  }
];

export const documents: WorkspaceDocument[] = [
  {
    id: "doc-1",
    name: "Northbound master routing.pdf",
    category: "Route Docs",
    tour: "Northbound Ruin 2026",
    show: "-",
    updatedAt: "2026-05-16",
    owner: "Alex Mercer"
  },
  {
    id: "doc-2",
    name: "The Black Heart contract.pdf",
    category: "Contracts",
    tour: "Northbound Ruin 2026",
    show: "The Black Heart",
    updatedAt: "2026-05-11",
    owner: "Mae Hollow"
  },
  {
    id: "doc-3",
    name: "Band passports.zip",
    category: "Passports",
    tour: "Northbound Ruin 2026",
    show: "-",
    updatedAt: "2026-05-09",
    owner: "Rina Vale"
  },
  {
    id: "doc-4",
    name: "Eurotunnel booking.pdf",
    category: "Travel",
    tour: "Northbound Ruin 2026",
    show: "-",
    updatedAt: "2026-05-17",
    owner: "Alex Mercer"
  }
];

export const teamMembers: TeamMember[] = [
  {
    id: "team-1",
    name: "Alex Mercer",
    role: "Vocalist / Workspace Owner",
    workspaceRole: "owner",
    location: "London",
    focus: "Tour routing, settlements, label sync",
    initials: "AM"
  },
  {
    id: "team-2",
    name: "Mae Hollow",
    role: "Tour Manager",
    workspaceRole: "admin",
    location: "Manchester",
    focus: "Advances, hospitality, documents",
    initials: "MH"
  },
  {
    id: "team-3",
    name: "Dani Croft",
    role: "Merch Seller",
    workspaceRole: "member",
    location: "Leeds",
    focus: "Inventory, night reports, cash count",
    initials: "DC"
  },
  {
    id: "team-4",
    name: "Amina Solberg",
    role: "Driver",
    workspaceRole: "viewer",
    location: "Brussels",
    focus: "Vehicle, border docs, timing updates",
    initials: "AS"
  },
  {
    id: "team-5",
    name: "Noah Veil",
    role: "Sound Engineer",
    workspaceRole: "member",
    location: "Paris",
    focus: "FOH mix, patch, line check, stage changeovers",
    initials: "NV"
  }
];

export const epkData = {
  bio:
    "Widespread Disease is a touring-first heavy band built around violent contrast, precision, and overwhelming live impact, with a project identity designed for dark rooms and long overnight drives.",
  members: [
    "Alex Mercer - vocals",
    "Jonah Pike - guitar",
    "Elis Reed - bass",
    "Rina Vale - drums"
  ],
  socials: [
    "instagram.com/widespreaddisease",
    "youtube.com/@widespreaddisease",
    "tiktok.com/@widespreaddisease"
  ],
  spotifyMonthlyListeners: 67200,
  youtubeViews: 428000,
  topMarkets: ["London", "Manchester", "Glasgow", "Berlin"],
  assets: ["Press photo pack", "Logo kit", "Latest single artwork", "Live session clips"]
};

export function getShowById(showId: string) {
  return shows.find((show) => show.id === showId) ?? null;
}

export function getTourById(tourId: string) {
  return tours.find((tour) => tour.id === tourId) ?? null;
}

export function getRoutePointsForTour(tourId: string): RoutePoint[] {
  const tour = getTourById(tourId);

  if (!tour) {
    return [];
  }

  return tour.stops.map((stop) => {
    const show = shows.find((entry) => entry.venue === stop.venue);
    const address =
      stop.address ??
      show?.address ??
      `${stop.venue}, ${stop.city}, ${stop.country}`;

    return {
      id: `${tourId}-${stop.venue}`,
      city: stop.city,
      country: stop.country,
      venue: stop.venue,
      date: stop.date,
      address,
      distanceKm: stop.distanceKm,
      status: stop.status,
      label: `${stop.city} • ${stop.venue}`
    };
  });
}
