import { requireAuth, db, readBody, ok, handleError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = await readBody(event)
  if (!competitionId || !courseId || !Array.isArray(holeScores)) return ok({ success: false, reason: 'Incomplete payload' })

  try {
    const existing = db.prepare(`SELECT id FROM scores WHERE playerId = ? AND competitionId = ?`).get(authUserId, competitionId) as any
    const totalPts = Number(stablefordPoints || 0)

    if (existing) {
      db.prepare(`UPDATE scores SET holeScores = ?, stablefordPoints = ? WHERE id = ?`).run(JSON.stringify(holeScores), totalPts, existing.id)
    } else {
      const player = db.prepare(`SELECT handicapIndex FROM players WHERE id = ?`).get(authUserId) as any
      const hcp = Number(player?.handicapIndex || 18)
      const id = crypto.randomUUID()
      db.prepare(`INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, authUserId, competitionId, courseId, JSON.stringify(holeScores), totalPts, hcp, hcp)
    }
    return ok({ success: true })
  } catch (err) { handleError(err) }
})
