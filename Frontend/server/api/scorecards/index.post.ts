import { db } from '../../utils/db'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const authUserId = getCookie(event, 'auth_user_id')

  const competitionId = body.competitionId || body.competition_id
  const playerId = body.playerId || body.player_id || authUserId
  const scores = body.scores || body.holeScores || body.hole_scores || {}
  
  // Calculate holes completed and total points flexibly from incoming data
  const holesCompleted = Number(
    body.holesCompleted ?? 
    body.holes_completed ?? 
    Object.keys(scores).filter(h => scores[h] !== null && scores[h] !== undefined && scores[h] !== '').length
  )
  
  const totalPoints = Number(
    body.totalPoints ?? 
    body.total_points ?? 
    body.stablefordPoints ?? 
    0
  )

  if (!competitionId || !playerId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competitionId or playerId.' })
  }

  const scoresJson = typeof scores === 'string' ? scores : JSON.stringify(scores)

  try {
    // If competitionId is provided, we use an atomic UPSERT to guarantee no duplicates
    if (competitionId) {
      // First, check if a row already exists to preserve its original ID if needed, or upsert directly.
      // SQLite UPSERT syntax: INSERT ... ON CONFLICT(competitionId, playerId) DO UPDATE SET ...
      const existing = db.prepare(`
        SELECT id FROM scorecards 
        WHERE competitionId = ? AND playerId = ?
      `).get(competitionId, playerId) as any

      if (existing) {
        db.prepare(`
          UPDATE scorecards 
          SET holesCompleted = ?,
              totalPoints = ?,
              scores = ?
          WHERE id = ?
        `).run(holesCompleted, totalPoints, scoresJson, existing.id)

        return { success: true, scorecardId: existing.id }
      } else {
        const newId = randomUUID()
        db.prepare(`
          INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(newId, competitionId, playerId, holesCompleted, totalPoints, scoresJson)

        return { success: true, scorecardId: newId }
      }
    } else {
      // Casual round (no competitionId) -> always create a new scorecard entry
      const newId = randomUUID()
      db.prepare(`
        INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newId, null, playerId, holesCompleted, totalPoints, scoresJson)

      return { success: true, scorecardId: newId }
    }
  } catch (error: any) {
    console.error('Scorecard Save Error:', error)
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to save scorecard.' })
  }
})