export interface PaginationDto {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationDto;
}

export type Uuid = string;
