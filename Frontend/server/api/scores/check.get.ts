import { requireAuth, db, ok, handleError, getAuthUserId, getQuery } from '../../utils/api'
export default defineEventHandler(async (event) => {
  const authUserId = getAuthUserId(event)
  const { competitionId } = getQuery(event)
  if (!authUserId || !competitionId) return ok({ success: false, holeScores: null })

  try {
    const existing = db.prepare(`SELECT holeScores, stablefordPoints FROM scores WHERE playerId = ? AND competitionId = ?`).get(authUserId, competitionId) as any
    if (existing) return ok({ success: true, holeScores: existing.holeScores, stablefordPoints: existing.stablefordPoints })
    return ok({ success: false, holeScores: null })
  } catch { return ok({ success: false, holeScores: null }) }
})
