import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  const query = getQuery(event)
  const competitionId = query.competitionId as string

  if (!authUserId || !competitionId) {
    return { success: false, holeScores: null }
  }

  try {
    // Strictly look for a scorecard tied to THIS competition and THIS user
    const existing = db.prepare(`
      SELECT holeScores, stablefordPoints 
      FROM scores 
      WHERE playerId = ? AND competitionId = ?
    `).get(authUserId, competitionId) as any

    if (existing) {
      return {
        success: true,
        holeScores: existing.holeScores,
        stablefordPoints: existing.stablefordPoints
      }
    }

    return { success: false, holeScores: null }
  } catch (err) {
    return { success: false, holeScores: null }
  }
})