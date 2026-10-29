import { db, readBody, ok, handleError, createError, getAuthUserId } from '../../../utils/api'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const authUserId = getAuthUserId(event)
  const { playerId } = await readBody(event)
  const pid = playerId || authUserId
  if (!compId || !pid) throw createError({ statusCode: 400, statusMessage: 'Missing competition or player ID.' })
  try {
    if (!db.prepare(`SELECT * FROM competition_lobby WHERE competitionId = ? AND playerId = ?`).get(compId, pid))
      db.prepare(`INSERT INTO competition_lobby (id, competitionId, playerId) VALUES (?, ?, ?)`).run(randomUUID(), compId, pid)
    if (!db.prepare(`SELECT id FROM scorecards WHERE competitionId = ? AND playerId = ?`).get(compId, pid))
      db.prepare(`INSERT INTO scorecards (id, competitionId, playerId, holesCompleted, totalPoints, scores) VALUES (?, ?, ?, 0, 0, '{}')`).run(randomUUID(), compId, pid)
    return ok({ success: true })
  } catch (e) { handleError(e, 'Failed to join lobby.') }
})
