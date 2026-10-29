import { db, readBody, createError } from '../../utils/api'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const { name, username, password, handicapIndex } = await readBody(event)
  if (!name || !username || !password) throw createError({ statusCode: 400, statusMessage: 'Name, username, and password are required.' })

  const id = crypto.randomUUID()
  const hashedPassword = await bcrypt.hash(password, 10)
  const initialHcp = parseFloat(handicapIndex) || 18.0

  const count = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number }
  const role = count.count === 0 ? 'ADMIN' : 'MEMBER'

  try {
    db.prepare(`INSERT INTO players (id, name, username, password, handicapIndex, nextRoundPenalty, role, active) VALUES (?, ?, ?, ?, ?, 0.0, ?, 1)`)
      .run(id, name.trim(), username.trim().toLowerCase(), hashedPassword, initialHcp, role)

    setCookie(event, 'auth_user_id', id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    return { success: true, role }
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE')) throw createError({ statusCode: 400, statusMessage: 'Username is already taken.' })
    throw createError({ statusCode: 500, statusMessage: 'Registration failed.' })
  }
})
