/** Wire formats shared by every API module. Domain types live in their entity (entities/<name>/model/types.ts). */

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldErrorBody {
  field: string;
  message: string;
}

/** Error body the backend sends for every 4xx/5xx (GlobalExceptionHandler). */
export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: FieldErrorBody[];
}
