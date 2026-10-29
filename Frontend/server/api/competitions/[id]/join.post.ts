import { db } from '../../../utils/db'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const body = await readBody(event)
  const authUserId = getCookie(event, 'auth_user_id')
  const playerId = body?.playerId || authUserId

  if (!compId || !playerId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing competition or player ID.' })
  }

  try {
    // 1. Add to Lobby
    const existingLobby = db.prepare(`
      SELECT * FROM competition_lobby WHERE competitionId = ? AND playerId = ?
    `).get(compId, playerId)

    if (!existingLobby) {
      db.prepare(`
        INSERT INTO competition_lobby (id, competitionId, playerId)
        VALUES (?, ?, ?)
      `).run(randomUUID(), compId, playerId)
    }

    // 2. Initialize blank Scorecard if it doesn't exist yet
    const existingCard = db.prepare(`
      SELECT id FROM scorecards WHERE competitionId = ? AND playerId = ?
    `).get(compId, playerId)

    if (!existingCard) {
      db.prepare(`
        INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores)
        VALUES (?, ?, ?, 0, 0, '{}')
      `).run(randomUUID(), compId, playerId)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Join Lobby error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to join lobby.' })
  }
})