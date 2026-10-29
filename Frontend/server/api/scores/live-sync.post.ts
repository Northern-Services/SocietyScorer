import { db } from '../../utils/db'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = body

  if (!competitionId || !courseId || !Array.isArray(holeScores)) {
    return { success: false, reason: 'Incomplete payload' }
  }

  // 1. Check if the player already has a live scorecard entry for this competition
  const existingScore = db.prepare(`
    SELECT id FROM scores WHERE playerId = ? AND competitionId = ?
  `).get(authUserId, competitionId) as any

  const totalPts = Number(stablefordPoints || 0)

  try {
    if (existingScore) {
      // Update running scores & points live
      db.prepare(`
        UPDATE scores 
        SET holeScores = ?, stablefordPoints = ? 
        WHERE id = ?
      `).run(JSON.stringify(holeScores), totalPts, existingScore.id)
    } else {
      // Insert initial live scorecard draft
      const player = db.prepare(`SELECT handicapIndex FROM players WHERE id = ?`).get(authUserId) as any
      const hcp = Number(player?.handicapIndex || 18)
      const id = crypto.randomUUID()

      db.prepare(`
        INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        authUserId,
        competitionId,
        courseId,
        JSON.stringify(holeScores),
        totalPts,
        hcp,
        hcp
      )
    }

    return { success: true }
  } catch (err: any) {
    console.error('Live Sync Error:', err)
    return { success: false, error: err.message }
  }
})