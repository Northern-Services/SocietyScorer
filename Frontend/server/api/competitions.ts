import { db, readBody, ok, handleError, createError } from '../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const method = event.node.req.method
  if (method === 'GET') {
    try {
      return ok({ data: (await db.execute('SELECT * FROM competitions ORDER BY date DESC')).rows })
    } catch (e) { handleError(e) }
  }
  const { name, courseId, date, venue, status, prize1st, prize2nd, prize3rd, potAmount } = await readBody(event)
  if (!name || !date) throw createError({ statusCode: 400, statusMessage: 'Competition title and date are required.' })
  let resolvedVenue = venue || 'Home Course'
  if (courseId) {
    const c = (await db.execute('SELECT name, location FROM courses WHERE id = ?', [courseId])).rows[0] as any
    if (c) resolvedVenue = `${c.name} (${c.location})`
  }
  const id = crypto.randomUUID()
  try {
    // Ensure potAmount column exists (migration for existing DBs)
    try { await db.execute('ALTER TABLE competitions ADD COLUMN potAmount REAL DEFAULT 0') } catch { /* column may already exist */ }
    await db.execute(`INSERT INTO competitions (id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd, potAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, name, date, resolvedVenue, courseId || null, status || 'OPEN', Number(prize1st || 0), Number(prize2nd || 0), Number(prize3rd || 0), Number(potAmount || 0)])
    return ok({ id })
  } catch (e) { handleError(e, 'Error creating competition fixture.') }
})
