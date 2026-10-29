import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { name, location, numHoles, pars, strokeIndexes, handicapRules } = await readBody(event)
  if (!name || !location) throw createError({ statusCode: 400, statusMessage: 'Name and location are required.' })
  const courseId = randomUUID()
  try {
    db.prepare(`INSERT INTO courses (id, name, location, numHoles, pars, strokeIndexes, handicapRules, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(courseId, name, location, Number(numHoles || 18), typeof pars === 'string' ? pars : JSON.stringify(pars || []), typeof strokeIndexes === 'string' ? strokeIndexes : JSON.stringify(strokeIndexes || []), typeof handicapRules === 'string' ? handicapRules : JSON.stringify(handicapRules || {}), authUserId || 'system')
    return ok({ data: { id: courseId, name, location, numHoles: Number(numHoles || 18), pars, strokeIndexes, handicapRules } })
  } catch (e: any) { handleError(e, `Database Error: ${e.message}`) }
})
