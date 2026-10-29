import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''

  let courses: any[] = []

  if (query) {
    courses = db.prepare(`
      SELECT id, name, location, numHoles, pars, strokeIndexes 
      FROM courses 
      WHERE LOWER(name) LIKE ? OR LOWER(location) LIKE ?
      ORDER BY name ASC
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`)
  } else {
    courses = db.prepare(`
      SELECT id, name, location, numHoles, pars, strokeIndexes 
      FROM courses 
      ORDER BY name ASC
      LIMIT 50
    `).all()
  }

  const formattedCourses = courses.map(c => ({
    ...c,
    pars: JSON.parse(c.pars || '[]'),
    strokeIndexes: JSON.parse(c.strokeIndexes || '[]')
  }))

  return { success: true, courses: formattedCourses }
})