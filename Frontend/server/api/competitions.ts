import { db } from '../utils/db'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  // GET: Fetch all competitions
  if (method === 'GET') {
    try {
      const competitions = db.prepare('SELECT * FROM competitions ORDER BY date DESC').all()
      return { success: true, data: competitions }
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  // POST: Create a new competition fixture
  if (method === 'POST') {
    const body = await readBody(event)
    const { name, courseId, date, venue, status, prize1st, prize2nd, prize3rd } = body

    if (!name || !date) {
      throw createError({ statusCode: 400, statusMessage: 'Competition title and date are required.' })
    }

    // Dynamic venue fallback: check course name from DB if courseId is passed
    let resolvedVenue = venue || 'Home Course'
    if (courseId) {
      const course = db.prepare('SELECT name, location FROM courses WHERE id = ?').get(courseId) as any
      if (course) {
        resolvedVenue = `${course.name} (${course.location})`
      }
    }

    const id = crypto.randomUUID()

    try {
      db.prepare(`
        INSERT INTO competitions (id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        date,
        resolvedVenue,
        courseId || null,
        status || 'OPEN',
        Number(prize1st || 0),
        Number(prize2nd || 0),
        Number(prize3rd || 0)
      )

      return { success: true, id }
    } catch (error: any) {
      console.error('Error creating competition fixture:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }
})