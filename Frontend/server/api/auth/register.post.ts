import { db } from '../../utils/db'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, username, password, handicapIndex } = body

  if (!name || !username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Name, username, and password are required.' })
  }

  const initialHcp = parseFloat(handicapIndex) || 18.0
  const id = crypto.randomUUID()

  // Hash password securely (10 salt rounds)
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const existingPlayersCount = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number }
    const assignedRole = existingPlayersCount.count === 0 ? 'ADMIN' : 'MEMBER'

    db.prepare(`
      INSERT INTO players (id, name, username, password, handicapIndex, nextRoundPenalty, role, active)
      VALUES (?, ?, ?, ?, ?, 0.0, ?, 1)
    `).run(id, name.trim(), username.trim().toLowerCase(), hashedPassword, initialHcp, assignedRole)

    setCookie(event, 'auth_user_id', id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    })

    return { success: true, role: assignedRole }
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE')) {
      throw createError({ statusCode: 400, statusMessage: 'Username is already taken.' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Registration failed.' })
  }
})