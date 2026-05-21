export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
}

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

export * from '@/types';
export type {
  AuthoringEndpoints,
  AuthoringResponse,
  PreviewPayload,
  TaskDraft,
  ValidationResult,
} from '@/features/authoring/types';
