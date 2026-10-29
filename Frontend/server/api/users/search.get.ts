import { requireAuth, db, ok, handleError, getAuthUserId, getQuery } from '../../utils/api'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  if (!query || query.length < 2) return ok({ users: [] })

  try {
    const users = db.prepare(`SELECT id, name, username, handicapIndex, role FROM players WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(username) LIKE ?) LIMIT 10`).all(authUserId, `%${query}%`, `%${query}%`) as any[]

    const result = users.map(u => {
      const f = db.prepare(`SELECT * FROM friendships WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`).get(authUserId, u.id, u.id, authUserId) as any
      let fs = 'NONE'
      if (f) fs = f.status === 'ACCEPTED' ? 'FRIENDS' : f.status === 'PENDING' ? (f.requesterId === authUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED') : 'NONE'
      return { ...u, friendStatus: fs }
    })

    return ok({ users: result })
  } catch (error) { handleError(error) }
})
