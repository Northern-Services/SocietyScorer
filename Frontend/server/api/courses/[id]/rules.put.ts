import { requireAuth, requireAdmin, db, readBody, ok, handleError, createError, getAuthUserId } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const courseId = event.context.params?.id
  const authUserId = getAuthUserId(event)
  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing course ID.' })
  await requireAdmin(event)
  const { handicapRules, nextRoundPenalties } = await readBody(event)
  try {
    await db.execute(`UPDATE courses SET handicapRules = ? WHERE id = ?`, [JSON.stringify({ handicapRules, nextRoundPenalties }), courseId])
    return ok({ success: true, message: 'Course handicap rules saved successfully.' })
  } catch (e) { handleError(e, 'Failed to save course rules.') }
})
