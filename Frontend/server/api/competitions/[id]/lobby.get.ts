import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id

  if (!compId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  }

  try {
    const players = db.prepare(`
      SELECT 
        p.id,
        p.name,
        COALESCE(p.handicapIndex, 0) as handicapIndex
      FROM competition_lobby cl
      JOIN players p ON cl.playerId = p.id
      WHERE cl.competitionId = ?
      ORDER BY cl.joinedAt ASC
    `).all(compId) as any[]

    return {
      success: true,
      data: players
    }
  } catch (error: any) {
    console.error('Lobby fetch error:', error)
    return { success: true, data: [] }
  }
})