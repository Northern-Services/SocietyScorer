import { db, ok, handleError } from '../utils/api'

export default defineEventHandler(async () => {
  try {
    const players = (await db.execute('SELECT * FROM players ORDER BY name ASC')).rows
    return ok({ data: players })
  } catch (error) { handleError(error) }
})
