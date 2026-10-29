import { db, readBody, ok, handleError } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const id = event.context.params?.id
  const method = event.node.req.method
  if (method === 'PUT') {
    const body = await readBody(event)
    try {
      db.prepare(`UPDATE players SET handicapIndex = ?, nextRoundPenalty = ?, active = ? WHERE id = ?`).run(body.handicapIndex, body.nextRoundPenalty ?? 0.0, body.active ? 1 : 0, id)
      return ok({ success: true })
    } catch (e: any) { handleError(e, e.message) }
  }
})
