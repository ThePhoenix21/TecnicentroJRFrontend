export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string;
  dni?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  ruc?: string;
  dni?: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

export interface ClientsResponse {
  data: Client[];
  total: number;
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}
