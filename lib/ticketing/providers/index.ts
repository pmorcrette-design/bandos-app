import type { TicketingProviderClient } from "@/lib/ticketing/providers/shared";
import { eventbriteProvider } from "@/lib/ticketing/providers/eventbrite";
import { ticketTailorProvider } from "@/lib/ticketing/providers/ticket-tailor";
import type { TicketingProvider } from "@/lib/ticketing/types";

const providers: Record<TicketingProvider, TicketingProviderClient> = {
  "ticket-tailor": ticketTailorProvider,
  eventbrite: eventbriteProvider
};

export function getTicketingProviderClient(provider: TicketingProvider) {
  return providers[provider];
}

export function listTicketingProviders() {
  return Object.values(providers).map((provider) => ({
    key: provider.key,
    label: provider.label
  }));
}
