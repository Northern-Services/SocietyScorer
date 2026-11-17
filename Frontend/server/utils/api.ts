import { getCookie, setCookie, deleteCookie, createError, readBody, getQuery, setHeader } from 'h3'
import { db } from './db'
import { isAdminRole, USER_ROLES } from './roles'

/** Extract authenticated user id from session cookie */
export const getAuthUserId = (event: any): string | null =>
  getCookie(event, 'auth_user_id') || null

/** Require authentication; throws 401 if missing */
export const requireAuth = (event: any): string => {
  const id = getAuthUserId(event)
  if (!id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please sign in.' })
  return id
}

/** Require admin role; throws 403 if missing or not admin */
export const requireAdmin = async (event: any): Promise<string> => {
  const id = requireAuth(event)
  const admin = (await db.execute('SELECT role FROM players WHERE id = ?', [id])).rows[0] as any
  if (!admin || !isAdminRole(admin.role))
    throw createError({ statusCode: 403, statusMessage: 'Forbidden. Admin privileges required.' })
  return id
}

/** Re-export role constants for use in route handlers */
export { USER_ROLES, isAdminRole, DEFAULT_ROLE, FIRST_USER_ROLE }
export type { UserRole }

/** Standard success response wrapper */
export const ok = (data: any = {}, message?: string) => ({
  success: true,
  ...(message ? { message } : {}),
  ...data
})

/** Standardized error handler for route bodies */
export const handleError = (error: any, defaultMessage = 'Internal server error') => {
  console.error('API Error:', error)
  throw createError({
    statusCode: error.statusCode || 500,
    statusMessage: error.statusMessage || error.message || defaultMessage
  })
}

/** Re-export commonly used h3 helpers */
export { getCookie, setCookie, deleteCookie, createError, readBody, getQuery, setHeader, db }
