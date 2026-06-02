export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface ErrorResponse {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

/** Response returned by the backend upload endpoint (`POST /api/admin/upload`). */
export interface UploadResult {
  url: string;
  publicId: string;
  originalName: string;
  size: number;
  mimetype: string;
  folder: string;
}
