import { db, readBody, createError, ok } from '../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  const body = await readBody(event)
  const id = crypto.randomUUID()
  try {
    await db.execute(`INSERT INTO players (id, name, handicapIndex, nextRoundPenalty, active) VALUES (?, ?, ?, ?, ?)`, [id, body.name, body.handicapIndex, body.nextRoundPenalty || 0, body.active ? 1 : 0])
    return ok({ playerId: id })
  } catch (error: any) { throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to create player.' }) }
})
