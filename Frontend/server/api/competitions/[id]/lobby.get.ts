import { db, ok, handleError, createError } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  if (!compId) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  try {
    const players = (await db.execute(`SELECT p.id, p.name, COALESCE(p.handicapIndex, 0) as handicapIndex FROM competition_lobby cl JOIN players p ON cl.playerId = p.id WHERE cl.competitionId = ? ORDER BY cl.joinedAt ASC`, [compId])).rows as any[]
    return ok({ data: players })
  } catch { return ok({ data: [] }) }
})
