import { db } from '../../utils/db'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const authUserId = getCookie(event, 'auth_user_id')

  const { name, location, numHoles, pars, strokeIndexes, handicapRules } = body

  if (!name || !location) {
    throw createError({ statusCode: 400, statusMessage: 'Name and location are required.' })
  }

  // Ensure arrays are stringified correctly before storing in SQLite
  const parsString = typeof pars === 'string' ? pars : JSON.stringify(pars || [])
  const siString = typeof strokeIndexes === 'string' ? strokeIndexes : JSON.stringify(strokeIndexes || [])
  const rulesString = typeof handicapRules === 'string' ? handicapRules : JSON.stringify(handicapRules || {})

  try {
    const courseId = randomUUID()

    db.prepare(`
      INSERT INTO courses (id, name, location, numHoles, pars, strokeIndexes, handicapRules, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      courseId,
      name,
      location,
      Number(numHoles || 18),
      parsString,
      siString,
      rulesString,
      authUserId || 'system'
    )

    return {
      success: true,
      data: {
        id: courseId,
        name,
        location,
        numHoles: Number(numHoles || 18),
        pars: parsString,
        strokeIndexes: siString,
        handicapRules: rulesString
      }
    }
  } catch (error: any) {
    console.error('Course Creation Error:', error)
    throw createError({ statusCode: 500, statusMessage: `Database Error: ${error.message}` })
  }
})