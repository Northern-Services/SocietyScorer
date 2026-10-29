import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const method = event.node.req.method

  if (method === 'PUT') {
    const body = await readBody(event)

    try {
      db.prepare(`
        UPDATE players 
        SET handicapIndex = ?, nextRoundPenalty = ?, active = ?
        WHERE id = ?
      `).run(
        body.handicapIndex,
        body.nextRoundPenalty ?? 0.0,
        body.active ? 1 : 0,
        id
      )

      return { success: true }
    } catch (error: any) {
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }
})