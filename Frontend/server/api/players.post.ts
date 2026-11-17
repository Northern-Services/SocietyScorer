import { db, readBody, createError, ok, DEFAULT_ROLE, USER_ROLES } from '../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const id = crypto.randomUUID()
  const role = body.role && Object.values(USER_ROLES).includes(body.role) ? body.role : DEFAULT_ROLE
  try {
    await db.execute(`INSERT INTO players (id, name, username, password, handicapIndex, nextRoundPenalty, role, active) VALUES (?, ?, ?, ?, ?, 0.0, ?, ?)`, [id, body.name, body.username || body.name.toLowerCase().replace(/\s+/g, ''), body.password || '', body.handicapIndex || 18.0, role, body.active ? 1 : 0])
    return ok({ playerId: id, role })
  } catch (error: any) { throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to create player.' }) }
})
