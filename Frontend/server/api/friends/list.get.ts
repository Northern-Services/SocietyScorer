import { requireAuth, db, ok, handleError, getAuthUserId } from '../../utils/api'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  try {
    const accepted = db.prepare(`SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role FROM friendships f JOIN players p ON (f.requesterId = ? AND f.receiverId = p.id) OR (f.receiverId = ? AND f.requesterId = p.id) WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'ACCEPTED'`).all(authUserId, authUserId, authUserId, authUserId) as any[]
    const pending = db.prepare(`SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role FROM friendships f JOIN players p ON f.requesterId = p.id WHERE f.receiverId = ? AND f.status = 'PENDING'`).all(authUserId) as any[]
    return ok({ friends: accepted, pendingRequests: pending })
  } catch (error) { handleError(error) }
})
