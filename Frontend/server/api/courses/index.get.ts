import { db, ok, handleError, getQuery } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  try {
    // Ensure lat/long columns exist (migration for existing DBs)
    try { db.prepare('ALTER TABLE courses ADD COLUMN latitude REAL').run() } catch { /* column may already exist */ }
    try { db.prepare('ALTER TABLE courses ADD COLUMN longitude REAL').run() } catch { /* column may already exist */ }
    const rows: any[] = query
      ? db.prepare(`SELECT id, name, location, numHoles, pars, strokeIndexes, latitude, longitude FROM courses WHERE LOWER(name) LIKE ? OR LOWER(location) LIKE ? ORDER BY name ASC LIMIT 20`).all(`%${query}%`, `%${query}%`)
      : db.prepare(`SELECT id, name, location, numHoles, pars, strokeIndexes, latitude, longitude FROM courses ORDER BY name ASC LIMIT 50`).all()
    return ok({ courses: rows.map((c: any) => ({ ...c, pars: JSON.parse(c.pars || '[]'), strokeIndexes: JSON.parse(c.strokeIndexes || '[]') })) })
  } catch (e: any) { handleError(e) }
})
