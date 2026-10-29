import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const body = await readBody(event)
  const authUserId = getCookie(event, 'auth_user_id')
  const { status } = body // e.g., 'ACTIVE' or 'CLOSED'

  if (!compId || !status) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competition ID or status.' })
  }

  const admin = db.prepare(`SELECT role FROM players WHERE id = ?`).get(authUserId) as any
  if (!admin || admin.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden. Admin privileges required.' })
  }

  try {
    db.prepare(`UPDATE competitions SET status = ? WHERE id = ?`).run(status, compId)
    return { success: true, status }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to update competition status.' })
  }
})