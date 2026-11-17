import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { targetUserId, action } = await readBody(event)
  if (!targetUserId || !action) throw createError({ statusCode: 400, statusMessage: 'Missing target user or action.' })

  try {
    if (action === 'ADD') {
      const existing = (await db.execute('SELECT id FROM friendships WHERE requesterId = ? AND receiverId = ?', [authUserId, targetUserId])).rows[0]
      if (!existing) await db.execute(`INSERT INTO friendships (id, requesterId, receiverId, status) VALUES (?, ?, ?, 'PENDING')`, [crypto.randomUUID(), authUserId, targetUserId])
    } else if (action === 'ACCEPT') {
      await db.execute(`UPDATE friendships SET status = 'ACCEPTED' WHERE requesterId = ? AND receiverId = ?`, [targetUserId, authUserId])
    } else if (action === 'REMOVE') {
      await db.execute(`DELETE FROM friendships WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`, [authUserId, targetUserId, targetUserId, authUserId])
    }
    return ok()
  } catch (error) { handleError(error) }
})
