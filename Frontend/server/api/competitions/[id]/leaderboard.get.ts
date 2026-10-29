import { db } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id

  if (!compId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  }

  try {
    const rows = db.prepare(`
      SELECT 
        s.id as scorecardId,
        s.playerId,
        p.name as playerName,
        COALESCE(p.handicapIndex, 0) as handicapIndex,
        COALESCE(s.stablefordPoints, 0) as stablefordPoints,
        s.holeScores
      FROM scores s
      JOIN players p ON s.playerId = p.id
      WHERE s.competitionId = ?
      ORDER BY s.stablefordPoints DESC
    `).all(compId) as any[]

    let rank = 1
    const leaderboard = rows.map((entry, index) => {
      const currentPoints = Number(entry.stablefordPoints || 0)
      if (index > 0 && currentPoints < Number(rows[index - 1].stablefordPoints || 0)) {
        rank = index + 1
      }

      let scoresParsed = {}
      try {
        scoresParsed = typeof entry.holeScores === 'string' ? JSON.parse(entry.holeScores) : (entry.holeScores || {})
      } catch (e) {
        scoresParsed = {}
      }

      // Count holes completed from holeScores object keys
      const holesCompleted = Object.keys(scoresParsed).filter(h => scoresParsed[h] !== null && scoresParsed[h] !== undefined && scoresParsed[h] !== '').length

      return {
        scorecardId: entry.scorecardId,
        playerId: entry.playerId,
        playerName: entry.playerName,
        handicapIndex: Number(entry.handicapIndex || 0),
        stablefordPoints: currentPoints,
        holesCompleted,
        holeScores: scoresParsed,
        rank
      }
    })

    return {
      success: true,
      data: { leaderboard }
    }
  } catch (error: any) {
    console.error('Leaderboard fetch error:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})