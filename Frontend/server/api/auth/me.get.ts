import { db } from '../../utils/db'
import { calculatePlayingHandicap } from '../../utils/handicap'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    return { success: false, data: null }
  }

  const user = db.prepare(`
    SELECT id, name, username, handicapIndex, nextRoundPenalty, role, active
    FROM players WHERE id = ?
  `).get(authUserId) as any

  if (!user) {
    return { success: false, data: null }
  }

  const handicapIndex = Number(user.handicapIndex || 0)
  const penalty = Number(user.nextRoundPenalty || 0)
  const playingHandicap = calculatePlayingHandicap(handicapIndex, penalty)

  return {
    success: true,
    data: {
      ...user,
      handicapIndex,
      nextRoundPenalty: penalty,
      playingHandicap
    }
  }
})