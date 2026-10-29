import { requireAuth, requireAdmin, db, readBody, ok, handleError, createError, getAuthUserId } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const authUserId = getAuthUserId(event)
  const { status } = await readBody(event)
  if (!compId || !status) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID or status.' })
  requireAdmin(event)
  try {
    db.prepare(`UPDATE competitions SET status = ? WHERE id = ?`).run(status, compId)
    return ok({ success: true, status })
  } catch (e) { handleError(e, 'Failed to update competition status.') }
})
