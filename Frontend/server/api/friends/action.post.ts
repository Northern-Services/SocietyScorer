import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { targetUserId, action } = await readBody(event)
  if (!targetUserId || !action) throw createError({ statusCode: 400, statusMessage: 'Missing target user or action.' })

  try {
    if (action === 'ADD') {
      const existing = db.prepare('SELECT id FROM friendships WHERE requesterId = ? AND receiverId = ?').get(authUserId, targetUserId)
      if (!existing) db.prepare(`INSERT INTO friendships (id, requesterId, receiverId, status) VALUES (?, ?, ?, 'PENDING')`).run(crypto.randomUUID(), authUserId, targetUserId)
    } else if (action === 'ACCEPT') {
      db.prepare(`UPDATE friendships SET status = 'ACCEPTED' WHERE requesterId = ? AND receiverId = ?`).run(targetUserId, authUserId)
    } else if (action === 'REMOVE') {
      db.prepare(`DELETE FROM friendships WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`).run(authUserId, targetUserId, targetUserId, authUserId)
    }
    return ok()
  } catch (error) { handleError(error) }
})
