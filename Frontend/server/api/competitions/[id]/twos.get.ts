import { db, ok, handleError } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  if (!compId) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  try {
    const twos = db.prepare(`
      SELECT t.id, t.playerId, t.holeNumber, p.name as playerName, p.username
      FROM twos t
      JOIN players p ON t.playerId = p.id
      WHERE t.competitionId = ?
      ORDER BY t.holeNumber ASC
    `).all(compId) as any[]
    return ok({ data: twos })
  } catch (e) { handleError(e) }
})
