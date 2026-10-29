import { db, ok, handleError, createError } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  if (!compId) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  try {
    const rows = db.prepare(`SELECT s.id as scorecardId, s.playerId, p.name as playerName, COALESCE(p.handicapIndex, 0) as handicapIndex, COALESCE(s.stablefordPoints, 0) as stablefordPoints, s.holeScores FROM scores s JOIN players p ON s.playerId = p.id WHERE s.competitionId = ? ORDER BY s.stablefordPoints DESC`).all(compId) as any[]
    let rank = 1
    const leaderboard = rows.map((entry, i) => {
      const pts = Number(entry.stablefordPoints || 0)
      if (i > 0 && pts < Number(rows[i - 1].stablefordPoints || 0)) rank = i + 1
      let parsed: Record<string, any> = {}
      try { parsed = typeof entry.holeScores === 'string' ? JSON.parse(entry.holeScores) : (entry.holeScores || {}) } catch { parsed = {} }
      const holesCompleted = Object.keys(parsed).filter(h => parsed[h] !== null && parsed[h] !== undefined && parsed[h] !== '').length
      return { scorecardId: entry.scorecardId, playerId: entry.playerId, playerName: entry.playerName, handicapIndex: Number(entry.handicapIndex || 0), stablefordPoints: pts, holesCompleted, holeScores: parsed, rank }
    })
    return ok({ data: { leaderboard } })
  } catch (e) { handleError(e) }
})
