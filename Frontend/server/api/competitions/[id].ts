import { db, readBody, ok, handleError, createError } from '../../utils/api'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  if (event.node.req.method === 'GET') {
    try {
      const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(id)
      if (!comp) throw createError({ statusCode: 404, statusMessage: 'Competition not found.' })
      return ok({ data: comp })
    } catch (e) { handleError(e) }
  }
  const body = await readBody(event)
  try {
    const current = db.prepare('SELECT * FROM competitions WHERE id = ?').get(id) as any
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Competition not found.' })
    db.prepare(`UPDATE competitions SET status = ?, prize1st = ?, prize2nd = ?, prize3rd = ? WHERE id = ?`)
      .run(body.status ?? current.status, body.prize1st !== undefined ? Number(body.prize1st) : current.prize1st, body.prize2nd !== undefined ? Number(body.prize2nd) : current.prize2nd, body.prize3rd !== undefined ? Number(body.prize3rd) : current.prize3rd, id)
    return ok()
  } catch (e) { handleError(e) }
})
