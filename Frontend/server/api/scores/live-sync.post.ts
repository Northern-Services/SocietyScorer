import { requireAuth, db, readBody, ok, handleError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = await readBody(event)
  if (!competitionId || !courseId || !Array.isArray(holeScores)) return ok({ success: false, reason: 'Incomplete payload' })

  try {
    const existing = (await db.execute(`SELECT id FROM scores WHERE playerId = ? AND competitionId = ?`, [authUserId, competitionId])).rows[0] as any
    const totalPts = Number(stablefordPoints || 0)

    if (existing) {
      await db.execute(`UPDATE scores SET holeScores = ?, stablefordPoints = ? WHERE id = ?`, [JSON.stringify(holeScores), totalPts, existing.id])
    } else {
      const player = (await db.execute(`SELECT handicapIndex FROM players WHERE id = ?`, [authUserId])).rows[0] as any
      const hcp = Number(player?.handicapIndex || 18)
      const id = crypto.randomUUID()
      await db.execute(`INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, authUserId, competitionId, courseId, JSON.stringify(holeScores), totalPts, hcp, hcp])
    }
    return ok({ success: true })
  } catch (err) { handleError(err) }
})
