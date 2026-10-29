import { requireAuth, db, ok, getAuthUserId } from '../../utils/api'
import { calculatePlayingHandicap } from '../../utils/handicap'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const user = db.prepare(`SELECT id, name, username, handicapIndex, nextRoundPenalty, role, active FROM players WHERE id = ?`).get(authUserId) as any
  if (!user) return { success: false, data: null }

  return ok({ data: { ...user, handicapIndex: Number(user.handicapIndex || 0), nextRoundPenalty: Number(user.nextRoundPenalty || 0), playingHandicap: calculatePlayingHandicap(Number(user.handicapIndex || 0), Number(user.nextRoundPenalty || 0)) } })
})
