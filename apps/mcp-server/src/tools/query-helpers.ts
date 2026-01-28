/**
 * Helper functions for query-*-records tools
 */

/**
 * Pagination metadata returned with query results
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Common input parameters for query tools
 */
export interface QueryInput {
  childId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  orderBy?: "asc" | "desc";
  includeSummary?: boolean;
}

/**
 * Standard response structure for query tools
 */
export interface QueryResponse<T, S = unknown> {
  pagination: Pagination;
  dateRange: {
    start: string;
    end: string;
  };
  records: T[];
  summary?: S;
}

/**
 * Parse ISO date strings into Date objects with defaults
 * - startDate defaults to 7 days ago
 * - endDate defaults to now
 */
export function parseQueryDates(startDate?: string, endDate?: string): DateRange {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  return { start, end };
}

/**
 * Build pagination metadata from query results
 */
export function buildPagination(total: number, limit: number, offset: number): Pagination {
  const hasMore = offset + limit < total;
  return {
    total,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Sanitize and clamp limit to valid range (1-500, default 100)
 */
export function sanitizeLimit(limit?: number): number {
  if (limit === undefined || limit === null) return 100;
  return Math.max(1, Math.min(500, Math.floor(limit)));
}

/**
 * Sanitize offset to be non-negative (default 0)
 */
export function sanitizeOffset(offset?: number): number {
  if (offset === undefined || offset === null) return 0;
  return Math.max(0, Math.floor(offset));
}

/**
 * Build a standardized query response
 */
export function buildQueryResponse<T, S = unknown>(
  records: T[],
  total: number,
  limit: number,
  offset: number,
  start: Date,
  end: Date,
  summary?: S
): QueryResponse<T, S> {
  const response: QueryResponse<T, S> = {
    pagination: buildPagination(total, limit, offset),
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    records,
  };

  if (summary !== undefined) {
    response.summary = summary;
  }

  return response;
}

/**
 * Common input schema properties for query tools
 * Use this in tool registrations
 */
export const QUERY_INPUT_SCHEMA_PROPERTIES = {
  childId: {
    type: "string",
    description: "The ID of the child",
  },
  startDate: {
    type: "string",
    format: "date-time",
    description: "Start of date range (ISO 8601). Defaults to 7 days ago.",
  },
  endDate: {
    type: "string",
    format: "date-time",
    description: "End of date range (ISO 8601). Defaults to now.",
  },
  limit: {
    type: "number",
    minimum: 1,
    maximum: 500,
    default: 100,
    description: "Maximum number of records to return (1-500, default 100)",
  },
  offset: {
    type: "number",
    minimum: 0,
    default: 0,
    description: "Number of records to skip for pagination (default 0)",
  },
  orderBy: {
    type: "string",
    enum: ["asc", "desc"],
    default: "desc",
    description: "Sort order by time (default: desc, newest first)",
  },
  includeSummary: {
    type: "boolean",
    default: false,
    description: "Include aggregated summary statistics in response",
  },
} as const;
