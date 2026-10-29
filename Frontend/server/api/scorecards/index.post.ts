import { requireAuth, db, readBody, ok, handleError } from '../../utils/api'
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
      const existing = db.prepare(`SELECT id FROM scorecards WHERE competitionId = ? AND playerId = ?`).get(competitionId, playerId) as any
      if (existing) {
        db.prepare(`UPDATE scorecards SET holesCompleted = ?, totalPoints = ?, scores = ? WHERE id = ?`).run(holesCompleted, totalPoints, scoresJson, existing.id)
        return ok({ scorecardId: existing.id })
      }
      const newId = randomUUID()
      db.prepare(`INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores) VALUES (?, ?, ?, ?, ?, ?)`).run(newId, competitionId, playerId, holesCompleted, totalPoints, scoresJson)
      return ok({ scorecardId: newId })
    }
    const newId = randomUUID()
    db.prepare(`INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores) VALUES (?, ?, ?, ?, ?, ?)`).run(newId, null, playerId, holesCompleted, totalPoints, scoresJson)
    return ok({ scorecardId: newId })
  } catch (error) { handleError(error, 'Failed to save scorecard.') }
})
