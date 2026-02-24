export type TicketStatus = 'OPEN' | 'CANCELLED' | 'IN_PROGRESS' | 'REFUSED' | 'COMPLETED';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH';

export type SupportTicketListItem = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  message: string;
};

export type SupportTicketDetail = {
  id: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt?: string;
};

export type CreateSupportTicketDto = {
  subject: string;
  message: string;
};

export type CreateSupportTicketResponse = {
  message: string;
};

export type CancelSupportTicketResponse = {
  success: boolean;
  message?: string;
};
