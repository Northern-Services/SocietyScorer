import { requireAuth, db, ok, handleError, getAuthUserId } from '../../utils/api'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  try {
    const accepted = (await db.execute(`SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role FROM friendships f JOIN players p ON (f.requesterId = ? AND f.receiverId = p.id) OR (f.receiverId = ? AND f.requesterId = p.id) WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'ACCEPTED'`, [authUserId, authUserId, authUserId, authUserId])).rows as any[]
    const pending = (await db.execute(`SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role FROM friendships f JOIN players p ON f.requesterId = p.id WHERE f.receiverId = ? AND f.status = 'PENDING'`, [authUserId])).rows as any[]
    return ok({ friends: accepted, pendingRequests: pending })
  } catch (error) { handleError(error) }
})
