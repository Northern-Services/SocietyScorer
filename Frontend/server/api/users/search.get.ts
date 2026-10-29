import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  if (!query || query.length < 2) {
    return { success: true, users: [] }
  }

  // Find matching users (excluding yourself)
  const users = db.prepare(`
    SELECT id, name, username, handicapIndex, role
    FROM players
    WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(username) LIKE ?)
    LIMIT 10
  `).all(authUserId, `%${query}%`, `%${query}%`) as any[]

  // Map friendship statuses
  const usersWithStatus = users.map((u) => {
    const friendship = db.prepare(`
      SELECT * FROM friendships 
      WHERE (requesterId = ? AND receiverId = ?) 
         OR (requesterId = ? AND receiverId = ?)
    `).get(authUserId, u.id, u.id, authUserId) as any

    let friendStatus = 'NONE'
    if (friendship) {
      if (friendship.status === 'ACCEPTED') {
        friendStatus = 'FRIENDS'
      } else if (friendship.status === 'PENDING') {
        friendStatus = friendship.requesterId === authUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED'
      }
    }

    return {
      ...u,
      friendStatus
    }
  })

  return { success: true, users: usersWithStatus }
})