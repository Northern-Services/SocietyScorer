import { requireAuth, requireAdmin, db, readBody, ok, handleError, createError, getAuthUserId } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const authUserId = getAuthUserId(event)
  const { status } = await readBody(event)
  if (!compId || !status) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID or status.' })
  await requireAdmin(event)
  try {
    await db.execute(`UPDATE competitions SET status = ? WHERE id = ?`, [status, compId])
    return ok({ success: true, status })
  } catch (e) { handleError(e, 'Failed to update competition status.') }
})
