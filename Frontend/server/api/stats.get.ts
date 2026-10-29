import { db } from '../utils/db'

export default defineEventHandler(async (event) => {
  try {
    // 1. Total registered players
    const playerCountRes = db.prepare(`SELECT COUNT(*) as count FROM players`).get() as any
    const totalPlayers = playerCountRes?.count || 0

    // 2. Total competitions / fixtures created
    const compCountRes = db.prepare(`SELECT COUNT(*) as count FROM competitions`).get() as any
    const totalCompetitions = compCountRes?.count || 0

    // 3. Total prize money pooled across all competitions (1st + 2nd + 3rd)
    const prizesRes = db.prepare(`
      SELECT SUM(COALESCE(prize1st, 0) + COALESCE(prize2nd, 0) + COALESCE(prize3rd, 0)) as totalPool 
      FROM competitions
    `).get() as any
    const totalPrizePool = prizesRes?.totalPool || 0

    return {
      success: true,
      data: {
        totalPlayers,
        totalCompetitions,
        totalPrizePool
      }
    }
  } catch (error: any) {
    console.error('Stats Error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch metrics.' })
  }
})