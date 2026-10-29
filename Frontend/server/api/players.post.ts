import { db } from '../utils/db'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = crypto.randomUUID()
  
  db.prepare(`
    INSERT INTO players (id, name, handicapIndex, nextRoundPenalty, active)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, body.name, body.handicapIndex, body.nextRoundPenalty || 0, body.active ? 1 : 0)

  return { success: true, playerId: id }
})