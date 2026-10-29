import { db, ok, handleError } from '../../utils/api'

export default defineEventHandler(async () => {
  try {
    return ok({ data: db.prepare(`SELECT id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd, createdAt FROM competitions ORDER BY date ASC`).all() })
  } catch (e) { handleError(e, 'Failed to fetch competitions.') }
})
