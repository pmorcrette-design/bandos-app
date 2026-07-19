import type { TicketingProviderClient } from "@/lib/ticketing/providers/shared";
import { eventbriteProvider } from "@/lib/ticketing/providers/eventbrite";
import { ticketTailorProvider } from "@/lib/ticketing/providers/ticket-tailor";
import { weezeventProvider } from "@/lib/ticketing/providers/weezevent";
import type { TicketingProvider } from "@/lib/ticketing/types";

const providers: Record<TicketingProvider, TicketingProviderClient> = {
  "ticket-tailor": ticketTailorProvider,
  eventbrite: eventbriteProvider,
  weezevent: weezeventProvider
};

export function getTicketingProviderClient(provider: TicketingProvider) {
  return providers[provider];
}

export function listTicketingProviders() {
  return [
    {
      key: weezeventProvider.key,
      label: weezeventProvider.label
    }
  ];
}
