/**
 * Pagination Utilities
 * Standardized pagination helpers for API routes
 */

import { NextRequest } from 'next/server'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
  hasPrev: boolean
}

export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface SearchParams {
  search?: string
  searchFields?: string[]
}

export interface FilterParams {
  [key: string]: string | number | boolean | string[] | undefined
}

// Default values
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const DEFAULT_SORT_ORDER = 'desc'

/**
 * Parse pagination parameters from request URL
 */
export function parsePagination(request: NextRequest): PaginationParams {
  const { searchParams } = request.nextUrl

  const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10))
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10))
  )
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Parse sort parameters from request URL
 */
export function parseSort(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'createdAt'
): SortParams {
  const { searchParams } = request.nextUrl

  let sortBy = searchParams.get('sortBy') || defaultField
  const sortOrder = (searchParams.get('sortOrder') || DEFAULT_SORT_ORDER) as 'asc' | 'desc'

  // Validate sort field
  if (!allowedFields.includes(sortBy)) {
    sortBy = defaultField
  }

  // Validate sort order
  const validOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : DEFAULT_SORT_ORDER

  return { sortBy, sortOrder: validOrder }
}

/**
 * Parse search parameter from request URL
 */
export function parseSearch(request: NextRequest): string | undefined {
  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')?.trim()
  return search && search.length > 0 ? search : undefined
}

/**
 * Parse all common query parameters
 */
export function parseQueryParams(
  request: NextRequest,
  options: {
    allowedSortFields?: string[]
    defaultSortField?: string
  } = {}
): {
  pagination: PaginationParams
  sort: SortParams
  search?: string
} {
  const { allowedSortFields = ['createdAt', 'updatedAt'], defaultSortField = 'createdAt' } = options

  return {
    pagination: parsePagination(request),
    sort: parseSort(request, allowedSortFields, defaultSortField),
    search: parseSearch(request),
  }
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Build Prisma where clause for text search
 */
export function buildSearchWhere(
  search: string | undefined,
  fields: string[]
): Record<string, unknown> | undefined {
  if (!search || fields.length === 0) {
    return undefined
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: search,
        mode: 'insensitive',
      },
    })),
  }
}

/**
 * Build Prisma orderBy clause
 */
export function buildOrderBy(sort: SortParams): Record<string, 'asc' | 'desc'> {
  return { [sort.sortBy]: sort.sortOrder }
}

/**
 * Parse filter parameters from request
 */
export function parseFilters(
  request: NextRequest,
  allowedFilters: string[]
): FilterParams {
  const { searchParams } = request.nextUrl
  const filters: FilterParams = {}

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter)
    if (value !== null) {
      // Handle arrays (comma-separated)
      if (value.includes(',')) {
        filters[filter] = value.split(',').map((v) => v.trim())
      } else if (value === 'true') {
        filters[filter] = true
      } else if (value === 'false') {
        filters[filter] = false
      } else if (!isNaN(Number(value))) {
        filters[filter] = Number(value)
      } else {
        filters[filter] = value
      }
    }
  }

  return filters
}

/**
 * Build date range filter
 */
export function buildDateRangeWhere(
  request: NextRequest,
  fieldName: string = 'createdAt'
): Record<string, unknown> | undefined {
  const { searchParams } = request.nextUrl

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate && !endDate) {
    return undefined
  }

  const dateFilter: Record<string, Date> = {}

  if (startDate) {
    const start = new Date(startDate)
    if (!isNaN(start.getTime())) {
      dateFilter.gte = start
    }
  }

  if (endDate) {
    const end = new Date(endDate)
    if (!isNaN(end.getTime())) {
      // Set to end of day
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
  }

  if (Object.keys(dateFilter).length === 0) {
    return undefined
  }

  return { [fieldName]: dateFilter }
}
