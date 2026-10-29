import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const competitions = db.prepare(`
      SELECT id, name, date, venue, courseId, status, prize1st, prize2nd, prize3rd, createdAt
      FROM competitions
      ORDER BY date ASC
    `).all()

    return {
      success: true,
      data: competitions
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch competitions.' })
  }
})