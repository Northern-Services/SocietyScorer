import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // 1. Fetch Accepted Friends
  const acceptedFriends = db.prepare(`
    SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role
    FROM friendships f
    JOIN players p ON (
      (f.requesterId = ? AND f.receiverId = p.id) OR 
      (f.receiverId = ? AND f.requesterId = p.id)
    )
    WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'ACCEPTED'
  `).all(authUserId, authUserId, authUserId, authUserId) as any[]

  // 2. Fetch Pending Incoming Requests
  const pendingRequests = db.prepare(`
    SELECT f.id as friendshipId, p.id as friendId, p.name, p.username, p.handicapIndex, p.role
    FROM friendships f
    JOIN players p ON f.requesterId = p.id
    WHERE f.receiverId = ? AND f.status = 'PENDING'
  `).all(authUserId) as any[]

  return {
    success: true,
    friends: acceptedFriends,
    pendingRequests
  }
})