import { requireAuth, db, ok, handleError, getAuthUserId, getQuery } from '../../utils/api'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const query = getQuery(event).q?.toString().trim().toLowerCase() || ''
  if (!query || query.length < 2) return ok({ users: [] })

  try {
    const users = (await db.execute(`SELECT id, name, username, handicapIndex, role FROM players WHERE id != ? AND (LOWER(name) LIKE ? OR LOWER(username) LIKE ?) LIMIT 10`, [authUserId, `%${query}%`, `%${query}%`])).rows as any[]

    const result = await Promise.all(users.map(async (u) => {
      const f = (await db.execute(`SELECT * FROM friendships WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`, [authUserId, u.id, u.id, authUserId])).rows[0] as any
      let fs = 'NONE'
      if (f) fs = f.status === 'ACCEPTED' ? 'FRIENDS' : f.status === 'PENDING' ? (f.requesterId === authUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED') : 'NONE'
      return { ...u, friendStatus: fs }
    }))

    return ok({ users: result })
  } catch (error) { handleError(error) }
})
