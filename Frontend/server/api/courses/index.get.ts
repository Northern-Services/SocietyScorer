import { db, ok, handleError, getQuery } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  try {
    // Ensure lat/long columns exist (migration for existing DBs)
    try { await db.execute('ALTER TABLE courses ADD COLUMN latitude REAL') } catch { /* column may already exist */ }
    try { await db.execute('ALTER TABLE courses ADD COLUMN longitude REAL') } catch { /* column may already exist */ }
    const rows: any[] = query
      ? (await db.execute(`SELECT id, name, location, numHoles, pars, strokeIndexes, latitude, longitude FROM courses WHERE LOWER(name) LIKE ? OR LOWER(location) LIKE ? ORDER BY name ASC LIMIT 20`, [`%${query}%`, `%${query}%`])).rows
      : (await db.execute(`SELECT id, name, location, numHoles, pars, strokeIndexes, latitude, longitude FROM courses ORDER BY name ASC LIMIT 50`)).rows
    return ok({ courses: rows.map((c: any) => ({ ...c, pars: JSON.parse(c.pars || '[]'), strokeIndexes: JSON.parse(c.strokeIndexes || '[]') })) })
  } catch (e: any) { handleError(e) }
})
