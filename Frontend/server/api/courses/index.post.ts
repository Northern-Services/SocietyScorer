import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { name, location, numHoles, pars, strokeIndexes, handicapRules, latitude, longitude } = await readBody(event)
  if (!name || !location) throw createError({ statusCode: 400, statusMessage: 'Name and location are required.' })
  if (latitude !== null && latitude !== undefined && latitude !== '') {
    const lat = Number(latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) throw createError({ statusCode: 400, statusMessage: 'Latitude must be between -90 and 90.' })
  }
  if (longitude !== null && longitude !== undefined && longitude !== '') {
    const lon = Number(longitude)
    if (isNaN(lon) || lon < -180 || lon > 180) throw createError({ statusCode: 400, statusMessage: 'Longitude must be between -180 and 180.' })
  }
  const courseId = randomUUID()
  try {
    // Ensure lat/long columns exist (migration for existing DBs)
    try { await db.execute('ALTER TABLE courses ADD COLUMN latitude REAL') } catch { /* column may already exist */ }
    try { await db.execute('ALTER TABLE courses ADD COLUMN longitude REAL') } catch { /* column may already exist */ }
    await db.execute(`INSERT INTO courses (id, name, location, numHoles, pars, strokeIndexes, handicapRules, createdBy, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [courseId, name, location, Number(numHoles || 18), typeof pars === 'string' ? pars : JSON.stringify(pars || []), typeof strokeIndexes === 'string' ? strokeIndexes : JSON.stringify(strokeIndexes || []), typeof handicapRules === 'string' ? handicapRules : JSON.stringify(handicapRules || {}), authUserId || 'system', latitude || null, longitude || null])
    return ok({ data: { id: courseId, name, location, numHoles: Number(numHoles || 18), pars, strokeIndexes, handicapRules, latitude, longitude } })
  } catch (e: any) { handleError(e, `Database Error: ${e.message}`) }
})
