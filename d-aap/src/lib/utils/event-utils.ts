import type { Event } from '@/interfaces';
import type { Ticket } from '@/interfaces/tickets';

export function getActiveTicketSale(event: Event) {
    const activeSale = event.ticketSales?.find((sale) => sale.saleActive);
    if (!activeSale) return null;

    return {
        pricePerTicket: activeSale.pricePerTicket,
        currency: activeSale.currency,
        maxSupply: activeSale.maxSupply || 0,
        ticketsMinted: activeSale.ticketsMinted || 0,
        ticketsAvailable: (activeSale.maxSupply || 0) - (activeSale.ticketsMinted || 0),
        contractAddress: activeSale.contractAddress,
        chainId: activeSale.chainId,
    };
}

export function getEventTicketPrice(event: Event): number {
    const sale = getActiveTicketSale(event);
    return sale?.pricePerTicket || 0;
}

export function getEventCurrency(event: Event): string {
    const sale = getActiveTicketSale(event);
    return sale?.currency || 'ETH';
}

export function getEventTicketsAvailable(event: Event): number {
    const sale = getActiveTicketSale(event);
    return sale?.ticketsAvailable || 0;
}

export function getTicketCurrency(ticket: Ticket): string {
    const activeSale = ticket.event?.ticketSales?.find((sale) => sale.saleActive);
    return activeSale?.currency || 'ETH';
}

export function getImageUrl(url: string | undefined | null, fallback = '/placeholder.svg'): string {
    return url || fallback;
}

export function isEventSoldOut(event: Event): boolean {
    return getEventTicketsAvailable(event) === 0;
}

export function isEventUpcoming(event: Event): boolean {
    return event.status === 'UPCOMING';
}

export function isEventOngoing(event: Event): boolean {
    return event.status === 'ONGOING';
}

export function buildQueryParams(filters: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
        }
    });

    return params;
}
