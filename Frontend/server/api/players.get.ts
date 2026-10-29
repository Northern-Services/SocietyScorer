import { db, ok, handleError } from '../utils/api'

export default defineEventHandler(() => {
  try {
    const players = db.prepare('SELECT * FROM players ORDER BY name ASC').all()
    return ok({ data: players })
  } catch (error) { handleError(error) }
})
