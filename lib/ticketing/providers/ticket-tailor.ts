import {
  fetchProviderJson,
  maskSecret,
  toCurrencyMajor,
  toInteger,
  type TicketingProviderClient
} from "@/lib/ticketing/providers/shared";

const API_BASE_URL = "https://api.tickettailor.com/v1";

function buildAuthHeader(apiKey: string) {
  const encoded = Buffer.from(`${apiKey.trim()}:`).toString("base64");
  return `Basic ${encoded}`;
}

function getPrimaryApiKey(credentials: { apiKey?: string }) {
  const apiKey = credentials.apiKey?.trim();

  if (!apiKey) {
    throw new Error("MISSING_TICKET_TAILOR_API_KEY");
  }

  return apiKey;
}

async function getTicketTailorJson<T>(path: string, apiKey: string) {
  return fetchProviderJson<T>(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: buildAuthHeader(apiKey)
    },
    cache: "no-store"
  });
}

export const ticketTailorProvider: TicketingProviderClient = {
  key: "ticket-tailor",
  label: "Ticket Tailor",
  buildCredentialsPreview: (credentials) => ({
    primary: maskSecret(getPrimaryApiKey(credentials))
  }),
  async listExternalEvents(credentials) {
    const apiKey = getPrimaryApiKey(credentials);
    const payload = await getTicketTailorJson<{
      data?: Array<Record<string, unknown>>;
    }>("/events", apiKey);

    return (payload.data ?? []).map((event) => ({
      id: String(event.id ?? ""),
      title: String(event.title ?? event.name ?? "Ticket Tailor event"),
      startsAt:
        typeof event.start?.toString === "function"
          ? String(event.start)
          : typeof event.start_date === "string"
            ? event.start_date
            : null,
      venueName:
        typeof event.venue === "object" && event.venue && "name" in event.venue
          ? String((event.venue as { name?: unknown }).name ?? "")
          : null,
      venueCity:
        typeof event.venue === "object" && event.venue && "city" in event.venue
          ? String((event.venue as { city?: unknown }).city ?? "")
          : null,
      currency: String(event.currency ?? "GBP"),
      capacity:
        typeof event.capacity === "number"
          ? toInteger(event.capacity)
          : typeof event.quantity === "number"
            ? toInteger(event.quantity)
            : null,
      url:
        typeof event.url === "string"
          ? event.url
          : typeof event.public_url === "string"
            ? event.public_url
            : null
    }));
  },
  async syncEvent(credentials, externalEventId) {
    const apiKey = getPrimaryApiKey(credentials);
    const [eventPayload, ticketTypePayload, orderPayload, issuedTicketPayload] =
      await Promise.all([
        getTicketTailorJson<{ data?: Record<string, unknown> }>(
          `/events/${externalEventId}`,
          apiKey
        ),
        getTicketTailorJson<{ data?: Array<Record<string, unknown>> }>(
          `/ticket_types?event_id=${encodeURIComponent(externalEventId)}`,
          apiKey
        ).catch(() => ({ data: [] })),
        getTicketTailorJson<{ data?: Array<Record<string, unknown>> }>(
          `/orders?event_id=${encodeURIComponent(externalEventId)}`,
          apiKey
        ).catch(() => ({ data: [] })),
        getTicketTailorJson<{ data?: Array<Record<string, unknown>> }>(
          `/issued_tickets?event_id=${encodeURIComponent(externalEventId)}`,
          apiKey
        ).catch(() => ({ data: [] }))
      ]);

    const event = eventPayload.data ?? {};
    const ticketClasses = (ticketTypePayload.data ?? []).map((ticketType) => {
      const quantity = toInteger(ticketType.quantity);
      const sold = toInteger(ticketType.quantity_sold ?? ticketType.sold);

      return {
        externalId: String(ticketType.id ?? ""),
        name: String(ticketType.title ?? ticketType.name ?? "Ticket"),
        price: toCurrencyMajor(ticketType.price),
        currency: String(ticketType.currency ?? event.currency ?? "GBP"),
        quantityTotal: quantity || null,
        quantitySold: sold,
        quantityRemaining:
          quantity > 0 ? Math.max(quantity - sold, 0) : null,
        isHidden: Boolean(ticketType.hidden),
        salesStartAt:
          typeof ticketType.sales_start === "string"
            ? ticketType.sales_start
            : null,
        salesEndAt:
          typeof ticketType.sales_end === "string"
            ? ticketType.sales_end
            : null
      };
    });

    const orders = (orderPayload.data ?? []).map((order) => {
      const quantity = toInteger(order.quantity ?? order.tickets_count);
      const grossAmount = toCurrencyMajor(
        order.total ?? order.total_amount ?? order.gross
      );
      const feeAmount = toCurrencyMajor(order.fee ?? order.total_fees ?? 0);
      const netAmount = Math.max(grossAmount - feeAmount, 0);

      return {
        externalId: String(order.id ?? ""),
        reference: String(order.reference ?? order.short_reference ?? order.id ?? ""),
        status: String(order.status ?? "completed"),
        buyerName: String(order.name ?? order.customer_name ?? "Ticket buyer"),
        buyerEmail: String(order.email ?? order.customer_email ?? ""),
        quantity,
        grossAmount,
        feeAmount,
        netAmount,
        currency: String(order.currency ?? event.currency ?? "GBP"),
        createdAt:
          typeof order.created_at === "string"
            ? order.created_at
            : new Date().toISOString(),
        updatedAt:
          typeof order.updated_at === "string"
            ? order.updated_at
            : typeof order.modified_at === "string"
              ? order.modified_at
              : new Date().toISOString()
      };
    });

    const attendees = (issuedTicketPayload.data ?? []).map((ticket) => ({
      externalId: String(ticket.id ?? ""),
      orderExternalId:
        ticket.order_id != null ? String(ticket.order_id) : null,
      ticketClassExternalId:
        ticket.ticket_type_id != null ? String(ticket.ticket_type_id) : null,
      name: String(ticket.full_name ?? ticket.name ?? "Attendee"),
      email: String(ticket.email ?? ""),
      status: String(ticket.status ?? "active"),
      checkedIn: Boolean(ticket.checked_in_at),
      refunded: Boolean(ticket.refunded_at),
      cancelled: Boolean(ticket.cancelled_at),
      createdAt:
        typeof ticket.created_at === "string"
          ? ticket.created_at
          : new Date().toISOString(),
      updatedAt:
        typeof ticket.updated_at === "string"
          ? ticket.updated_at
          : new Date().toISOString()
    }));

    const grossRevenue = orders.reduce((sum, order) => sum + order.grossAmount, 0);
    const fees = orders.reduce((sum, order) => sum + order.feeAmount, 0);
    const netRevenue = orders.reduce((sum, order) => sum + order.netAmount, 0);
    const ticketsSold = attendees.length || orders.reduce((sum, order) => sum + order.quantity, 0);
    const capacity =
      typeof event.capacity === "number"
        ? toInteger(event.capacity)
        : typeof event.quantity === "number"
          ? toInteger(event.quantity)
          : ticketClasses.reduce(
              (sum, ticketClass) => sum + (ticketClass.quantityTotal ?? 0),
              0
            ) || null;
    const remainingCapacity =
      capacity !== null ? Math.max(capacity - ticketsSold, 0) : null;
    const refundCount = attendees.filter((attendee) => attendee.refunded).length;

    return {
      event: {
        externalEventId,
        externalEventUrl:
          typeof event.url === "string"
            ? event.url
            : typeof event.public_url === "string"
              ? event.public_url
              : null,
        title: String(event.title ?? event.name ?? "Ticket Tailor event"),
        startsAt:
          typeof event.start_date === "string"
            ? event.start_date
            : typeof event.start === "string"
              ? event.start
              : null,
        venueName:
          typeof event.venue === "object" && event.venue && "name" in event.venue
            ? String((event.venue as { name?: unknown }).name ?? "")
            : null,
        venueCity:
          typeof event.venue === "object" && event.venue && "city" in event.venue
            ? String((event.venue as { city?: unknown }).city ?? "")
            : null,
        currency: String(event.currency ?? "GBP"),
        capacity,
        grossRevenue,
        netRevenue,
        fees,
        ticketsSold,
        remainingCapacity,
        averageTicketPrice: ticketsSold > 0 ? grossRevenue / ticketsSold : null,
        guestlistCount: 0,
        refundCount
      },
      ticketClasses,
      orders,
      attendees,
      snapshot: {
        grossRevenue,
        netRevenue,
        fees,
        ticketsSold,
        remainingCapacity,
        capacitySoldPercentage:
          capacity && capacity > 0 ? (ticketsSold / capacity) * 100 : null,
        averageTicketPrice: ticketsSold > 0 ? grossRevenue / ticketsSold : null,
        guestlistCount: 0,
        refundCount
      }
    };
  },
  parseWebhook(payload) {
    const record = (payload ?? {}) as Record<string, unknown>;
    const type = String(record.type ?? record.event ?? "unknown");

    return {
      type:
        type === "order.created" ||
        type === "order.updated" ||
        type === "attendee.updated" ||
        type === "refund.updated" ||
        type === "cancellation.updated"
          ? type
          : "unknown",
      externalEventId:
        record.event_id != null ? String(record.event_id) : null,
      externalOrderId:
        record.order_id != null ? String(record.order_id) : null,
      externalAttendeeId:
        record.attendee_id != null ? String(record.attendee_id) : null,
      summary: `Ticket Tailor webhook received: ${type}`
    };
  }
};
