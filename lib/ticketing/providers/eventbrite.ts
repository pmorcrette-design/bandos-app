import {
  fetchProviderJson,
  maskSecret,
  toCurrencyMajor,
  toInteger,
  type TicketingProviderClient
} from "@/lib/ticketing/providers/shared";

const API_BASE_URL = "https://www.eventbriteapi.com/v3";

function getPrivateToken(credentials: { privateToken?: string }) {
  const token = credentials.privateToken?.trim();

  if (!token) {
    throw new Error("MISSING_EVENTBRITE_PRIVATE_TOKEN");
  }

  return token;
}

async function getEventbriteJson<T>(path: string, privateToken: string) {
  return fetchProviderJson<T>(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${privateToken}`
    },
    cache: "no-store"
  });
}

export const eventbriteProvider: TicketingProviderClient = {
  key: "eventbrite",
  label: "Eventbrite",
  buildCredentialsPreview: (credentials) => ({
    primary: maskSecret(getPrivateToken(credentials)),
    secondary: credentials.organizerId?.trim() || undefined
  }),
  async listExternalEvents(credentials) {
    const privateToken = getPrivateToken(credentials);
    const payload = await getEventbriteJson<{
      events?: Array<Record<string, unknown>>;
    }>("/users/me/owned_events/?status=live,draft,ended", privateToken);

    return (payload.events ?? []).map((event) => {
      const venue = (event.venue as Record<string, unknown> | undefined) ?? {};
      const capacity = toInteger(event.capacity ?? 0);

      return {
        id: String(event.id ?? ""),
        title: String(event.name && typeof event.name === "object" ? (event.name as { text?: unknown }).text ?? "Eventbrite event" : event.name ?? "Eventbrite event"),
        startsAt:
          typeof event.start === "object" && event.start && "utc" in event.start
            ? String((event.start as { utc?: unknown }).utc ?? "")
            : null,
        venueName: typeof venue.name === "string" ? venue.name : null,
        venueCity:
          typeof venue.address === "object" && venue.address && "city" in venue.address
            ? String((venue.address as { city?: unknown }).city ?? "")
            : null,
        currency: String(event.currency ?? "USD"),
        capacity: capacity > 0 ? capacity : null,
        url: typeof event.url === "string" ? event.url : null
      };
    });
  },
  async syncEvent(credentials, externalEventId) {
    const privateToken = getPrivateToken(credentials);
    const [event, ticketClassesPayload, ordersPayload, attendeesPayload] =
      await Promise.all([
        getEventbriteJson<Record<string, unknown>>(`/events/${externalEventId}/`, privateToken),
        getEventbriteJson<{ ticket_classes?: Array<Record<string, unknown>> }>(
          `/events/${externalEventId}/ticket_classes/`,
          privateToken
        ).catch(() => ({ ticket_classes: [] })),
        getEventbriteJson<{ orders?: Array<Record<string, unknown>> }>(
          `/events/${externalEventId}/orders/`,
          privateToken
        ).catch(() => ({ orders: [] })),
        getEventbriteJson<{ attendees?: Array<Record<string, unknown>> }>(
          `/events/${externalEventId}/attendees/`,
          privateToken
        ).catch(() => ({ attendees: [] }))
      ]);

    const ticketClasses = (ticketClassesPayload.ticket_classes ?? []).map((ticketClass) => {
      const quantityTotal = toInteger(ticketClass.quantity_total);
      const quantitySold = toInteger(ticketClass.quantity_sold);

      return {
        externalId: String(ticketClass.id ?? ""),
        name: String(
          typeof ticketClass.name === "object" && ticketClass.name && "text" in ticketClass.name
            ? (ticketClass.name as { text?: unknown }).text ?? "Ticket class"
            : ticketClass.name ?? "Ticket class"
        ),
        price: toCurrencyMajor(
          typeof ticketClass.costs === "object" && ticketClass.costs && "gross" in ticketClass.costs
            ? (ticketClass.costs as { gross?: { value?: unknown } }).gross?.value
            : 0
        ),
        currency: String(ticketClass.currency ?? event.currency ?? "USD"),
        quantityTotal: quantityTotal > 0 ? quantityTotal : null,
        quantitySold,
        quantityRemaining:
          quantityTotal > 0 ? Math.max(quantityTotal - quantitySold, 0) : null,
        isHidden: Boolean(ticketClass.hidden),
        salesStartAt:
          typeof ticketClass.sales_start === "string"
            ? ticketClass.sales_start
            : null,
        salesEndAt:
          typeof ticketClass.sales_end === "string"
            ? ticketClass.sales_end
            : null
      };
    });

    const orders = (ordersPayload.orders ?? []).map((order) => {
      const grossMinor =
        typeof order.costs === "object" && order.costs && "gross" in order.costs
          ? toInteger((order.costs as { gross?: { value?: unknown } }).gross?.value)
          : 0;
      const eventbriteFeeMinor =
        typeof order.costs === "object" &&
        order.costs &&
        "eventbrite_fee" in order.costs
          ? toInteger(
              (order.costs as { eventbrite_fee?: { value?: unknown } }).eventbrite_fee
                ?.value
            )
          : 0;
      const paymentFeeMinor =
        typeof order.costs === "object" && order.costs && "payment_fee" in order.costs
          ? toInteger(
              (order.costs as { payment_fee?: { value?: unknown } }).payment_fee?.value
            )
          : 0;
      const grossAmount = toCurrencyMajor(grossMinor);
      const feeAmount = toCurrencyMajor(eventbriteFeeMinor + paymentFeeMinor);
      const netAmount = toCurrencyMajor(
        Math.max(grossMinor - eventbriteFeeMinor - paymentFeeMinor, 0)
      );

      return {
        externalId: String(order.id ?? ""),
        reference: String(order.resource_uri ?? order.id ?? ""),
        status: String(order.status ?? "placed"),
        buyerName: String(
          typeof order.profile === "object" && order.profile
            ? `${(order.profile as { first_name?: unknown }).first_name ?? ""} ${(order.profile as { last_name?: unknown }).last_name ?? ""}`.trim() || "Ticket buyer"
            : "Ticket buyer"
        ),
        buyerEmail:
          typeof order.email === "string" ? order.email : "",
        quantity: toInteger(order.quantity_total ?? order.attendees_count ?? 0),
        grossAmount,
        feeAmount,
        netAmount: netAmount > 0 ? netAmount / 100 : Math.max(grossAmount - feeAmount, 0),
        currency: String(order.currency ?? event.currency ?? "USD"),
        createdAt:
          typeof order.created === "string"
            ? order.created
            : new Date().toISOString(),
        updatedAt:
          typeof order.changed === "string"
            ? order.changed
            : new Date().toISOString()
      };
    });

    const attendees = (attendeesPayload.attendees ?? []).map((attendee) => ({
      externalId: String(attendee.id ?? ""),
      orderExternalId:
        attendee.order_id != null ? String(attendee.order_id) : null,
      ticketClassExternalId:
        attendee.ticket_class_id != null ? String(attendee.ticket_class_id) : null,
      name: String(
        typeof attendee.profile === "object" && attendee.profile
          ? `${(attendee.profile as { first_name?: unknown }).first_name ?? ""} ${(attendee.profile as { last_name?: unknown }).last_name ?? ""}`.trim() || "Attendee"
          : "Attendee"
      ),
      email:
        typeof attendee.profile === "object" && attendee.profile && "email" in attendee.profile
          ? String((attendee.profile as { email?: unknown }).email ?? "")
          : "",
      status: String(attendee.status ?? "attending"),
      checkedIn: Boolean(attendee.checked_in),
      refunded: String(attendee.status ?? "").toLowerCase().includes("refunded"),
      cancelled: String(attendee.cancelled ?? "").toLowerCase() === "true",
      createdAt:
        typeof attendee.created === "string"
          ? attendee.created
          : new Date().toISOString(),
      updatedAt:
        typeof attendee.changed === "string"
          ? attendee.changed
          : new Date().toISOString()
    }));

    const grossRevenue = orders.reduce((sum, order) => sum + order.grossAmount, 0);
    const fees = orders.reduce((sum, order) => sum + order.feeAmount, 0);
    const netRevenue = orders.reduce((sum, order) => sum + order.netAmount, 0);
    const ticketsSold =
      attendees.length ||
      ticketClasses.reduce((sum, ticketClass) => sum + ticketClass.quantitySold, 0);
    const capacity = toInteger(event.capacity ?? 0) || null;
    const remainingCapacity =
      capacity !== null ? Math.max(capacity - ticketsSold, 0) : null;
    const refundCount = attendees.filter((attendee) => attendee.refunded).length;

    return {
      event: {
        externalEventId,
        externalEventUrl: typeof event.url === "string" ? event.url : null,
        title: String(
          typeof event.name === "object" && event.name && "text" in event.name
            ? (event.name as { text?: unknown }).text ?? "Eventbrite event"
            : event.name ?? "Eventbrite event"
        ),
        startsAt:
          typeof event.start === "object" && event.start && "utc" in event.start
            ? String((event.start as { utc?: unknown }).utc ?? "")
            : null,
        venueName:
          typeof event.venue === "object" &&
          event.venue &&
          "name" in event.venue
            ? String((event.venue as { name?: unknown }).name ?? "")
            : null,
        venueCity:
          typeof event.venue === "object" &&
          event.venue &&
          "address" in event.venue &&
          typeof (event.venue as { address?: unknown }).address === "object"
            ? String(
                (
                  (event.venue as { address?: { city?: unknown } }).address ?? {}
                ).city ?? ""
              )
            : null,
        currency: String(event.currency ?? "USD"),
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
    const action =
      typeof record.action === "string"
        ? record.action
        : typeof record.config === "object" &&
            record.config &&
            "action" in record.config
          ? String((record.config as { action?: unknown }).action ?? "unknown")
          : "unknown";

    const normalizedType =
      action.includes("order.place") || action.includes("order.placed")
        ? "order.created"
        : action.includes("order.update")
          ? "order.updated"
          : action.includes("attendee.update")
            ? "attendee.updated"
            : action.includes("refund")
              ? "refund.updated"
              : action.includes("cancel")
                ? "cancellation.updated"
                : "unknown";

    return {
      type: normalizedType,
      externalEventId:
        record.event_id != null ? String(record.event_id) : null,
      externalOrderId:
        record.order_id != null ? String(record.order_id) : null,
      externalAttendeeId:
        record.attendee_id != null ? String(record.attendee_id) : null,
      summary: `Eventbrite webhook received: ${action}`
    };
  }
};
