import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const method = event.node.req.method

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  }

  // GET: Fetch a single competition by ID (SELECT * automatically includes prize fields)
  if (method === 'GET') {
    try {
      const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(id)
      if (!comp) {
        throw createError({ statusCode: 404, statusMessage: 'Competition not found.' })
      }
      return { success: true, data: comp }
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  // PUT: Update competition status and/or prize pool
  if (method === 'PUT') {
    const body = await readBody(event)
    try {
      const currentComp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(id) as any
      if (!currentComp) {
        throw createError({ statusCode: 404, statusMessage: 'Competition not found.' })
      }

      // Preserve existing values if not explicitly provided in body
      const newStatus = body.status ?? currentComp.status
      const prize1st = body.prize1st !== undefined ? Number(body.prize1st) : currentComp.prize1st
      const prize2nd = body.prize2nd !== undefined ? Number(body.prize2nd) : currentComp.prize2nd
      const prize3rd = body.prize3rd !== undefined ? Number(body.prize3rd) : currentComp.prize3rd

      db.prepare(`
        UPDATE competitions 
        SET status = ?,
            prize1st = ?,
            prize2nd = ?,
            prize3rd = ?
        WHERE id = ?
      `).run(newStatus, prize1st, prize2nd, prize3rd, id)

      return { success: true }
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }
})