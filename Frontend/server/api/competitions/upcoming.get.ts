import { db, ok, handleError } from '../../utils/api'

export default defineEventHandler(async () => {
  try {
    return ok({ data: (await db.execute(`SELECT id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd, createdAt FROM competitions ORDER BY date ASC`)).rows })
  } catch (e) { handleError(e, 'Failed to fetch competitions.') }
})
