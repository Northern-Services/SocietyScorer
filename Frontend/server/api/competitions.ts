import { db, readBody, ok, handleError, createError } from '../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const method = event.node.req.method
  if (method === 'GET') {
    try {
      return ok({ data: db.prepare('SELECT * FROM competitions ORDER BY date DESC').all() })
    } catch (e) { handleError(e) }
  }
  const { name, courseId, date, venue, status, prize1st, prize2nd, prize3rd } = await readBody(event)
  if (!name || !date) throw createError({ statusCode: 400, statusMessage: 'Competition title and date are required.' })
  let resolvedVenue = venue || 'Home Course'
  if (courseId) {
    const c = db.prepare('SELECT name, location FROM courses WHERE id = ?').get(courseId) as any
    if (c) resolvedVenue = `${c.name} (${c.location})`
  }
  const id = crypto.randomUUID()
  try {
    db.prepare(`INSERT INTO competitions (id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, name, date, resolvedVenue, courseId || null, status || 'OPEN', Number(prize1st || 0), Number(prize2nd || 0), Number(prize3rd || 0))
    return ok({ id })
  } catch (e) { handleError(e, 'Error creating competition fixture.') }
})
