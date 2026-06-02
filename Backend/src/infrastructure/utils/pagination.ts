export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;

/**
 * Extract and normalise pagination parameters from an Express query object.
 * Falls back to DEFAULT_PAGE and DEFAULT_LIMIT when values are missing or invalid.
 */
export function getPaginationParams(query: Record<string, unknown>): PaginationParams {
  let page = parseInt(String(query['page'] ?? DEFAULT_PAGE), 10);
  let limit = parseInt(String(query['limit'] ?? DEFAULT_LIMIT), 10);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit };
}

/**
 * Calculate the MongoDB `skip` value for a given page and limit.
 * @example calculateSkip(2, 10) // → 10
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Construct a pagination metadata object from totals and page params.
 * @param total - Total number of documents matching the query
 * @param page  - Current page (1-based)
 * @param limit - Items per page
 */
export function buildPaginationMetadata(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Clamps page and limit to safe bounds.
 * Returns validated (and clamped) pagination params.
 */
export function validatePaginationBounds(page: number, limit: number): PaginationParams {
  const safePage = page < 1 ? DEFAULT_PAGE : page;
  const safeLimit = limit < 1 ? DEFAULT_LIMIT : limit > MAX_LIMIT ? MAX_LIMIT : limit;
  return { page: safePage, limit: safeLimit };
}
