import { db } from '../utils/db'

export default defineEventHandler(() => {
  const players = db.prepare('SELECT * FROM players ORDER BY name ASC').all()
  return { success: true, data: players }
})