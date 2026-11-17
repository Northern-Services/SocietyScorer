import { requireAuth, db, readBody, ok, handleError, getAuthUserId } from '../../utils/api'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const body = await readBody(event)
  const competitionId = body.competitionId || body.competition_id
  const playerId = body.playerId || body.player_id || authUserId
  const scores = body.scores || body.holeScores || body.hole_scores || {}
  const holesCompleted = Number(body.holesCompleted ?? body.holes_completed ?? Object.keys(scores).filter(h => scores[h] !== null && scores[h] !== undefined && scores[h] !== '').length)
  const totalPoints = Number(body.totalPoints ?? body.total_points ?? body.stablefordPoints ?? 0)

  if (!competitionId || !playerId) throw createError({ statusCode: 400, statusMessage: 'Missing competitionId or playerId.' })

  const scoresJson = typeof scores === 'string' ? scores : JSON.stringify(scores)
  try {
    if (competitionId) {
      const existing = (await db.execute(`SELECT id FROM scorecards WHERE competitionId = ? AND playerId = ?`, [competitionId, playerId])).rows[0] as any
      if (existing) {
        await db.execute(`UPDATE scorecards SET holesCompleted = ?, totalPoints = ?, scores = ? WHERE id = ?`, [holesCompleted, totalPoints, scoresJson, existing.id])
        return ok({ scorecardId: existing.id })
      }
      const newId = randomUUID()
      await db.execute(`INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores) VALUES (?, ?, ?, ?, ?, ?)`, [newId, competitionId, playerId, holesCompleted, totalPoints, scoresJson])
      return ok({ scorecardId: newId })
    }
    const newId = randomUUID()
    await db.execute(`INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores) VALUES (?, ?, ?, ?, ?, ?)`, [newId, null, playerId, holesCompleted, totalPoints, scoresJson])
    return ok({ scorecardId: newId })
  } catch (error) { handleError(error, 'Failed to save scorecard.') }
})
