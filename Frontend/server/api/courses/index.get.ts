import { db, ok, handleError, getQuery } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  try {
    const rows: any[] = query
      ? db.prepare(`SELECT id, name, location, numHoles, pars, strokeIndexes FROM courses WHERE LOWER(name) LIKE ? OR LOWER(location) LIKE ? ORDER BY name ASC LIMIT 20`).all(`%${query}%`, `%${query}%`)
      : db.prepare(`SELECT id, name, location, numHoles, pars, strokeIndexes FROM courses ORDER BY name ASC LIMIT 50`).all()
    return ok({ courses: rows.map((c: any) => ({ ...c, pars: JSON.parse(c.pars || '[]'), strokeIndexes: JSON.parse(c.strokeIndexes || '[]') })) })
  } catch (e: any) { handleError(e) }
})
