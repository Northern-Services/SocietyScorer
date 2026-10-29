import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const courseId = event.context.params?.id
  const body = await readBody(event)
  const authUserId = getCookie(event, 'auth_user_id')

  if (!courseId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing course ID.' })
  }

  const admin = db.prepare(`SELECT role FROM players WHERE id = ?`).get(authUserId) as any
  if (!admin || admin.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Admin privileges required.' })
  }

  const { handicapRules, nextRoundPenalties } = body
  const rulesJson = JSON.stringify({ handicapRules, nextRoundPenalties })

  try {
    db.prepare(`
      UPDATE courses 
      SET handicapRules = ?
      WHERE id = ?
    `).run(rulesJson, courseId)

    return { success: true, message: 'Course handicap rules saved successfully.' }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to save course rules.' })
  }
})