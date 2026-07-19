export type TicketingProvider = "ticket-tailor" | "eventbrite" | "weezevent";

export type TicketingIntegrationStatus = "connected" | "needs-attention" | "disconnected";

export type TicketingSyncLogLevel = "info" | "warning" | "error";

export type TicketingWebhookEventType =
  | "order.created"
  | "order.updated"
  | "attendee.updated"
  | "refund.updated"
  | "cancellation.updated"
  | "unknown";

export type TicketingCredentialInput = {
  apiKey?: string;
  privateToken?: string;
  organizerId?: string;
  username?: string;
  password?: string;
  webhookSecret?: string;
};

export type TicketingCredentialsPreview = {
  primary: string;
  secondary?: string;
};

export type TicketingIntegration = {
  id: string;
  workspaceId: string;
  provider: TicketingProvider;
  label: string;
  status: TicketingIntegrationStatus;
  credentialsPreview: TicketingCredentialsPreview;
  lastError: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketingEvent = {
  id: string;
  workspaceId: string;
  showId: string;
  integrationId: string;
  provider: TicketingProvider;
  externalEventId: string;
  externalEventUrl: string | null;
  title: string;
  startsAt: string | null;
  venueName: string | null;
  venueCity: string | null;
  currency: string;
  capacity: number | null;
  grossRevenue: number;
  netRevenue: number;
  fees: number;
  ticketsSold: number;
  remainingCapacity: number | null;
  averageTicketPrice: number | null;
  guestlistCount: number;
  refundCount: number;
  linkedAt: string;
  lastSyncedAt: string | null;
  updatedAt: string;
};

export type TicketClass = {
  id: string;
  workspaceId: string;
  showId: string;
  ticketingEventId: string;
  externalId: string;
  name: string;
  price: number;
  currency: string;
  quantityTotal: number | null;
  quantitySold: number;
  quantityRemaining: number | null;
  isHidden: boolean;
  salesStartAt: string | null;
  salesEndAt: string | null;
  updatedAt: string;
};

export type TicketOrder = {
  id: string;
  workspaceId: string;
  showId: string;
  ticketingEventId: string;
  externalId: string;
  reference: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketAttendee = {
  id: string;
  workspaceId: string;
  showId: string;
  ticketingEventId: string;
  externalId: string;
  orderExternalId: string | null;
  ticketClassExternalId: string | null;
  name: string;
  email: string;
  status: string;
  checkedIn: boolean;
  refunded: boolean;
  cancelled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TicketSalesSnapshot = {
  id: string;
  workspaceId: string;
  showId: string;
  ticketingEventId: string;
  grossRevenue: number;
  netRevenue: number;
  fees: number;
  ticketsSold: number;
  remainingCapacity: number | null;
  capacitySoldPercentage: number | null;
  averageTicketPrice: number | null;
  guestlistCount: number;
  refundCount: number;
  capturedAt: string;
};

export type TicketingSyncLog = {
  id: string;
  workspaceId: string;
  showId: string | null;
  integrationId: string | null;
  provider: TicketingProvider;
  level: TicketingSyncLogLevel;
  message: string;
  context: string | null;
  createdAt: string;
};

export type ProviderExternalEvent = {
  id: string;
  title: string;
  startsAt: string | null;
  venueName: string | null;
  venueCity: string | null;
  currency: string;
  capacity: number | null;
  url: string | null;
};

export type ProviderSyncBundle = {
  event: Omit<TicketingEvent, "id" | "workspaceId" | "showId" | "integrationId" | "provider" | "linkedAt" | "lastSyncedAt" | "updatedAt">;
  ticketClasses: Array<
    Omit<TicketClass, "id" | "workspaceId" | "showId" | "ticketingEventId" | "updatedAt">
  >;
  orders: Array<
    Omit<TicketOrder, "id" | "workspaceId" | "showId" | "ticketingEventId">
  >;
  attendees: Array<
    Omit<TicketAttendee, "id" | "workspaceId" | "showId" | "ticketingEventId">
  >;
  snapshot: Omit<
    TicketSalesSnapshot,
    "id" | "workspaceId" | "showId" | "ticketingEventId" | "capturedAt"
  >;
};

export type ProviderWebhookParseResult = {
  type: TicketingWebhookEventType;
  externalEventId: string | null;
  externalOrderId: string | null;
  externalAttendeeId: string | null;
  summary: string;
};
