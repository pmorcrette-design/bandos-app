import {
  fetchProviderJson,
  maskSecret,
  toInteger,
  type TicketingProviderClient
} from "@/lib/ticketing/providers/shared";

const API_BASE_URL = "https://api.weezevent.com";
const DEFAULT_CURRENCY = "EUR";

type WeezeventCredentials = {
  apiKey?: string;
  username?: string;
  password?: string;
};

type WeezeventSession = {
  apiKey: string;
  accessToken: string;
};

type WeezeventEventSummary = {
  id: string;
  title: string;
  startsAt: string | null;
  eventStartsAt: string | null;
};

function getWeezeventCredentials(credentials: WeezeventCredentials) {
  const apiKey = credentials.apiKey?.trim();
  const username = credentials.username?.trim();
  const password = credentials.password?.trim();

  if (!apiKey) {
    throw new Error("MISSING_WEEZEVENT_API_KEY");
  }

  if (!username) {
    throw new Error("MISSING_WEEZEVENT_USERNAME");
  }

  if (!password) {
    throw new Error("MISSING_WEEZEVENT_PASSWORD");
  }

  return {
    apiKey,
    username,
    password
  };
}

async function createWeezeventSession(
  credentials: WeezeventCredentials
): Promise<WeezeventSession> {
  const resolved = getWeezeventCredentials(credentials);
  const body = new URLSearchParams({
    api_key: resolved.apiKey,
    username: resolved.username,
    password: resolved.password
  });

  const payload = await fetchProviderJson<{ accessToken?: unknown }>(
    `${API_BASE_URL}/auth/access_token`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      body: body.toString(),
      cache: "no-store"
    }
  );

  const accessToken =
    typeof payload.accessToken === "string" ? payload.accessToken.trim() : "";

  if (!accessToken) {
    throw new Error("INVALID_WEEZEVENT_ACCESS_TOKEN");
  }

  return {
    apiKey: resolved.apiKey,
    accessToken
  };
}

function buildWeezeventQuery(
  session: WeezeventSession,
  pairs: Array<[string, string | number | boolean | null | undefined]>
) {
  const params = new URLSearchParams({
    api_key: session.apiKey,
    access_token: session.accessToken
  });

  for (const [key, value] of pairs) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    params.append(key, String(value));
  }

  return params;
}

async function getWeezeventJson<T>(
  path: string,
  session: WeezeventSession,
  pairs: Array<[string, string | number | boolean | null | undefined]> = []
) {
  const params = buildWeezeventQuery(session, pairs);

  return fetchProviderJson<T>(`${API_BASE_URL}${path}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toIsoLikeDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\u00a0/g, " ");
}

function buildCompoundExternalEventId(eventId: string, dateId: string) {
  return `${eventId}::${dateId}`;
}

function parseCompoundExternalEventId(externalEventId: string) {
  const [eventId, dateId] = externalEventId.split("::");

  return {
    eventId: eventId?.trim() ?? "",
    dateId: dateId?.trim() || null
  };
}

function getEventStartDate(event: Record<string, unknown>) {
  if (
    typeof event.date === "object" &&
    event.date &&
    "start" in event.date &&
    typeof (event.date as { start?: unknown }).start === "string"
  ) {
    return String((event.date as { start?: unknown }).start ?? "");
  }

  return null;
}

function flattenTicketNodes(
  entry: Record<string, unknown> | null | undefined
): Array<Record<string, unknown>> {
  if (!entry) {
    return [];
  }

  const directTickets = Array.isArray(entry.tickets)
    ? entry.tickets.filter(
        (ticket): ticket is Record<string, unknown> =>
          typeof ticket === "object" && ticket !== null
      )
    : [];
  const nestedCategories = Array.isArray(entry.categories)
    ? entry.categories.filter(
        (category): category is Record<string, unknown> =>
          typeof category === "object" && category !== null
      )
    : [];

  return [
    ...directTickets,
    ...nestedCategories.flatMap((category) => flattenTicketNodes(category))
  ];
}

function extractOwnerName(owner: Record<string, unknown> | null) {
  if (!owner) {
    return "Ticket buyer";
  }

  const firstName =
    typeof owner.first_name === "string" ? owner.first_name.trim() : "";
  const lastName =
    typeof owner.last_name === "string" ? owner.last_name.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Ticket buyer";
}

function isTruthyFlag(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function getWeezeventStatusLabel(
  refunded: boolean,
  cancelled: boolean,
  paid: boolean
) {
  if (cancelled) {
    return "cancelled";
  }

  if (refunded) {
    return "refunded";
  }

  return paid ? "paid" : "pending";
}

function getTicketClassName(ticket: Record<string, unknown>) {
  return typeof ticket.name === "string" && ticket.name.trim()
    ? ticket.name
    : "Ticket";
}

function getTicketQuota(ticket: Record<string, unknown>) {
  const quota = toInteger(ticket.quota);
  return quota > 0 ? quota : null;
}

function getTicketPrice(ticket: Record<string, unknown>) {
  return toNumber(ticket.price);
}

export const weezeventProvider: TicketingProviderClient = {
  key: "weezevent",
  label: "Weezevent",
  buildCredentialsPreview: (credentials) => {
    const resolved = getWeezeventCredentials(credentials);

    return {
      primary: maskSecret(resolved.apiKey),
      secondary: resolved.username
    };
  },
  async listExternalEvents(credentials) {
    const session = await createWeezeventSession(credentials);
    const eventsPayload = await getWeezeventJson<{
      events?: Array<Record<string, unknown>>;
    }>("/events", session, [
      ["include_not_published", true],
      ["include_closed", true],
      ["include_without_sales", true]
    ]);

    const events = (eventsPayload.events ?? [])
      .map((event) => {
        const id = String(event.id ?? "").trim();

        return {
          id,
          title:
            typeof event.name === "string" && event.name.trim()
              ? event.name
              : "Weezevent event",
          startsAt: getEventStartDate(event),
          eventStartsAt: getEventStartDate(event)
        } satisfies WeezeventEventSummary;
      })
      .filter((event) => event.id);

    if (events.length === 0) {
      return [];
    }

    const datesPayload = await getWeezeventJson<{
      dates?: Array<Record<string, unknown>>;
    }>(
      "/dates",
      session,
      [
        ["display_passed", true],
        ...events.map(
          (event): [string, string] => ["id_event[]", event.id]
        )
      ]
    ).catch(() => ({ dates: [] }));

    const datesByEvent = new Map<string, Array<Record<string, unknown>>>();

    for (const date of datesPayload.dates ?? []) {
      const eventId = String(date.id_event ?? "").trim();

      if (!eventId) {
        continue;
      }

      const currentDates = datesByEvent.get(eventId) ?? [];
      currentDates.push(date);
      datesByEvent.set(eventId, currentDates);
    }

    return events.flatMap((event) => {
      const eventDates = datesByEvent.get(event.id) ?? [];

      if (eventDates.length === 0) {
        return [
          {
            id: event.id,
            title: event.title,
            startsAt: event.startsAt,
            venueName: null,
            venueCity: null,
            currency: DEFAULT_CURRENCY,
            capacity: null,
            url: null
          }
        ];
      }

      return eventDates.map((date) => ({
        id: buildCompoundExternalEventId(event.id, String(date.id ?? "").trim()),
        title: event.title,
        startsAt: toIsoLikeDate(date.date) ?? event.eventStartsAt,
        venueName: null,
        venueCity: null,
        currency: DEFAULT_CURRENCY,
        capacity: null,
        url: null
      }));
    });
  },
  async syncEvent(credentials, externalEventId) {
    const session = await createWeezeventSession(credentials);
    const { eventId, dateId } = parseCompoundExternalEventId(externalEventId);

    if (!eventId) {
      throw new Error("INVALID_WEEZEVENT_EVENT_ID");
    }

    const [detailsPayload, ticketsPayload, datesPayload] = await Promise.all([
      getWeezeventJson<{ events?: Record<string, unknown> }>(
        `/event/${eventId}/details`,
        session
      ),
      getWeezeventJson<{ events?: Array<Record<string, unknown>> }>(
        "/tickets",
        session,
        [["id_event[]", eventId]]
      ).catch(() => ({ events: [] })),
      getWeezeventJson<{ dates?: Array<Record<string, unknown>> }>(
        "/dates",
        session,
        [
          ["display_passed", true],
          ["id_event[]", eventId]
        ]
      ).catch(() => ({ dates: [] }))
    ]);

    const details = detailsPayload.events ?? {};
    const ticketEvent =
      (ticketsPayload.events ?? []).find(
        (event) => String(event.id ?? "") === eventId
      ) ?? null;
    const flattenedTickets = flattenTicketNodes(ticketEvent);
    const dates = (datesPayload.dates ?? []).filter(
      (date) => String(date.id_event ?? "") === eventId
    );
    const selectedDate =
      dateId != null
        ? dates.find((date) => String(date.id ?? "").trim() === dateId) ?? null
        : null;
    const selectedTicketIds = new Set(
      Array.isArray(selectedDate?.tickets)
        ? selectedDate.tickets
            .map((ticketId) => String(ticketId ?? "").trim())
            .filter(Boolean)
        : []
    );
    const relevantTickets =
      selectedTicketIds.size > 0
        ? flattenedTickets.filter((ticket) =>
            selectedTicketIds.has(String(ticket.id ?? "").trim())
          )
        : flattenedTickets;
    const relevantTicketIdSet = new Set(
      relevantTickets
        .map((ticket) => String(ticket.id ?? "").trim())
        .filter(Boolean)
    );

    const participantQuery: Array<
      [string, string | number | boolean | null | undefined]
    > = [
      ["full", 1],
      ["include_deleted", 1]
    ];

    if (dateId && relevantTicketIdSet.size > 0) {
      for (const ticketId of relevantTicketIdSet) {
        participantQuery.push([`date_ticket[${dateId}][]`, ticketId]);
      }
    } else {
      participantQuery.push(["id_event[]", eventId]);
    }

    const participantsPayload = await getWeezeventJson<{
      participants?: Array<Record<string, unknown>>;
    }>("/participant/list", session, participantQuery).catch(() => ({
      participants: []
    }));

    const rawParticipants = (participantsPayload.participants ?? []).filter((entry) => {
      if (!dateId) {
        return String(entry.id_event ?? "") === eventId;
      }

      if (String(entry.id_date ?? "").trim() === dateId) {
        return true;
      }

      return relevantTicketIdSet.has(String(entry.id_ticket ?? "").trim());
    });

    const ticketCatalog = new Map<
      string,
      {
        name: string;
        price: number;
        quantityTotal: number | null;
        salesStartAt: string | null;
        salesEndAt: string | null;
      }
    >();

    for (const ticket of relevantTickets) {
      const ticketId = String(ticket.id ?? "").trim();

      if (!ticketId) {
        continue;
      }

      ticketCatalog.set(ticketId, {
        name: getTicketClassName(ticket),
        price: getTicketPrice(ticket),
        quantityTotal: getTicketQuota(ticket),
        salesStartAt: toIsoLikeDate(ticket.start_sale),
        salesEndAt: toIsoLikeDate(ticket.end_sale)
      });
    }

    const attendees = rawParticipants.map((participant) => {
      const owner =
        typeof participant.owner === "object" && participant.owner
          ? (participant.owner as Record<string, unknown>)
          : null;
      const refunded = isTruthyFlag(participant.refund);
      const cancelled = isTruthyFlag(participant.deleted);
      const paid = participant.paid !== false;
      const controlStatus =
        typeof participant.control_status === "object" && participant.control_status
          ? (participant.control_status as Record<string, unknown>)
          : null;
      const checkedIn =
        (typeof controlStatus?.scan_date === "string" &&
          controlStatus.scan_date !== "0000-00-00 00:00:00") ||
        (typeof controlStatus?.status === "string" && controlStatus.status !== "0");
      const externalId = String(
        participant.id_participant ?? participant.id_weez_ticket ?? ""
      ).trim();
      const orderExternalId = String(
        participant.transaction_reference ??
          participant.id_transaction ??
          participant.id_participant ??
          ""
      ).trim();

      return {
        externalId,
        orderExternalId: orderExternalId || null,
        ticketClassExternalId:
          participant.id_ticket != null ? String(participant.id_ticket) : null,
        name: extractOwnerName(owner),
        email: typeof owner?.email === "string" ? owner.email : "",
        status: getWeezeventStatusLabel(refunded, cancelled, paid),
        checkedIn,
        refunded,
        cancelled,
        createdAt:
          typeof participant.create_date === "string"
            ? participant.create_date
            : new Date().toISOString(),
        updatedAt:
          typeof participant.create_date === "string"
            ? participant.create_date
            : new Date().toISOString()
      };
    });

    const activeAttendees = attendees.filter(
      (attendee) => !attendee.cancelled && !attendee.refunded
    );
    const quantitySoldByTicket = new Map<string, number>();

    for (const attendee of activeAttendees) {
      const ticketId = attendee.ticketClassExternalId ?? "";

      if (!ticketId) {
        continue;
      }

      quantitySoldByTicket.set(
        ticketId,
        (quantitySoldByTicket.get(ticketId) ?? 0) + 1
      );
    }

    const ticketClasses = Array.from(ticketCatalog.entries()).map(
      ([externalId, ticket]) => {
        const quantitySold = quantitySoldByTicket.get(externalId) ?? 0;

        return {
          externalId,
          name: ticket.name,
          price: ticket.price,
          currency: DEFAULT_CURRENCY,
          quantityTotal: ticket.quantityTotal,
          quantitySold,
          quantityRemaining:
            ticket.quantityTotal !== null
              ? Math.max(ticket.quantityTotal - quantitySold, 0)
              : null,
          isHidden: false,
          salesStartAt: ticket.salesStartAt,
          salesEndAt: ticket.salesEndAt
        };
      }
    );

    const ordersByReference = new Map<
      string,
      {
        reference: string;
        buyerName: string;
        buyerEmail: string;
        quantity: number;
        grossAmount: number;
        refundedCount: number;
        cancelledCount: number;
        createdAt: string;
        updatedAt: string;
      }
    >();

    for (const attendee of attendees) {
      const ticketId = attendee.ticketClassExternalId ?? "";
      const ticket = ticketCatalog.get(ticketId);
      const reference = attendee.orderExternalId ?? attendee.externalId;
      const existingOrder = ordersByReference.get(reference) ?? {
        reference,
        buyerName: attendee.name,
        buyerEmail: attendee.email,
        quantity: 0,
        grossAmount: 0,
        refundedCount: 0,
        cancelledCount: 0,
        createdAt: attendee.createdAt,
        updatedAt: attendee.updatedAt
      };

      existingOrder.quantity += attendee.cancelled ? 0 : 1;

      if (attendee.refunded) {
        existingOrder.refundedCount += 1;
      } else if (attendee.cancelled) {
        existingOrder.cancelledCount += 1;
      } else {
        existingOrder.grossAmount += ticket?.price ?? 0;
      }

      if (attendee.createdAt < existingOrder.createdAt) {
        existingOrder.createdAt = attendee.createdAt;
      }

      if (attendee.updatedAt > existingOrder.updatedAt) {
        existingOrder.updatedAt = attendee.updatedAt;
      }

      ordersByReference.set(reference, existingOrder);
    }

    const orders = Array.from(ordersByReference.values()).map((order) => {
      const activeCount = Math.max(
        order.quantity - order.refundedCount - order.cancelledCount,
        0
      );
      const status =
        activeCount > 0
          ? "completed"
          : order.refundedCount > 0
            ? "refunded"
            : order.cancelledCount > 0
              ? "cancelled"
              : "pending";

      return {
        externalId: order.reference,
        reference: order.reference,
        status,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        quantity: activeCount,
        grossAmount: order.grossAmount,
        feeAmount: 0,
        netAmount: order.grossAmount,
        currency: DEFAULT_CURRENCY,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    const grossRevenue = orders.reduce((sum, order) => sum + order.grossAmount, 0);
    const fees = 0;
    const netRevenue = grossRevenue;
    const ticketsSold = activeAttendees.length;
    const guestlistCount = activeAttendees.filter((attendee) => {
      const ticket = ticketCatalog.get(attendee.ticketClassExternalId ?? "");
      return (ticket?.price ?? 0) <= 0;
    }).length;
    const refundCount = attendees.filter((attendee) => attendee.refunded).length;
    const capacity = ticketClasses.reduce(
      (sum, ticketClass) => sum + (ticketClass.quantityTotal ?? 0),
      0
    );
    const totalCapacity = capacity > 0 ? capacity : null;
    const remainingCapacity =
      totalCapacity !== null ? Math.max(totalCapacity - ticketsSold, 0) : null;
    const venue =
      typeof details.venue === "object" && details.venue
        ? (details.venue as Record<string, unknown>)
        : null;
    const extras =
      typeof details.extras === "object" && details.extras
        ? (details.extras as Record<string, unknown>)
        : null;
    const detailDates = Array.isArray(details.dates)
      ? details.dates.filter(
          (date): date is Record<string, unknown> =>
            typeof date === "object" && date !== null
        )
      : [];
    const startsAt =
      toIsoLikeDate(selectedDate?.date) ??
      toIsoLikeDate(detailDates[0]?.start) ??
      toIsoLikeDate(
        typeof details.period === "object" && details.period
          ? (details.period as { start?: unknown }).start
          : null
      );
    const title =
      typeof details.title === "string" && details.title.trim()
        ? details.title
        : "Weezevent event";

    return {
      event: {
        externalEventId,
        externalEventUrl:
          typeof details.site_url === "string" && details.site_url.trim()
            ? details.site_url
            : typeof extras?.minisite_url === "string" && extras.minisite_url.trim()
              ? extras.minisite_url
              : null,
        title,
        startsAt,
        venueName:
          typeof venue?.name === "string" && venue.name.trim() ? venue.name : null,
        venueCity:
          typeof venue?.city === "string" && venue.city.trim() ? venue.city : null,
        currency: DEFAULT_CURRENCY,
        capacity: totalCapacity,
        grossRevenue,
        netRevenue,
        fees,
        ticketsSold,
        remainingCapacity,
        averageTicketPrice: ticketsSold > 0 ? grossRevenue / ticketsSold : null,
        guestlistCount,
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
          totalCapacity && totalCapacity > 0
            ? (ticketsSold / totalCapacity) * 100
            : null,
        averageTicketPrice: ticketsSold > 0 ? grossRevenue / ticketsSold : null,
        guestlistCount,
        refundCount
      }
    };
  },
  parseWebhook(payload) {
    const record = (payload ?? {}) as Record<string, unknown>;

    return {
      type: "unknown",
      externalEventId:
        record.id_event != null ? String(record.id_event) : null,
      externalOrderId:
        record.transaction_reference != null
          ? String(record.transaction_reference)
          : record.id_transaction != null
            ? String(record.id_transaction)
            : null,
      externalAttendeeId:
        record.id_participant != null ? String(record.id_participant) : null,
      summary:
        "Weezevent push event received. Manual sync remains the reliable refresh path."
    };
  }
};
