import { api } from './api';
import type {
  CancelSupportTicketResponse,
  CreateSupportTicketDto,
  CreateSupportTicketResponse,
  SupportTicketDetail,
  SupportTicketListItem,
} from '@/types/support-ticket.types';

class SupportTicketService {
  async getTickets(): Promise<SupportTicketListItem[]> {
    const response = await api.get<SupportTicketListItem[]>('/support/tickets');
    return response.data;
  }

  async createTicket(dto: CreateSupportTicketDto): Promise<CreateSupportTicketResponse> {
    const response = await api.post<CreateSupportTicketResponse>('/support/tickets', dto);
    return response.data;
  }

  async getTicketById(ticketId: string): Promise<SupportTicketDetail> {
    const response = await api.get<SupportTicketDetail>(`/support/tickets/${ticketId}`);
    return response.data;
  }

  async cancelTicket(ticketId: string): Promise<CancelSupportTicketResponse> {
    const response = await api.delete<CancelSupportTicketResponse>(`/support/tickets/${ticketId}`);
    return response.data;
  }
}

export const supportTicketService = new SupportTicketService();
