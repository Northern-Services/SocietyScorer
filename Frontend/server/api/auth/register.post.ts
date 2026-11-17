import { db, readBody, createError, DEFAULT_ROLE, FIRST_USER_ROLE, USER_ROLES, getAuthUserId, isAdminRole } from '../../utils/api'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const { name, username, password, handicapIndex, role: requestedRole } = await readBody(event)
  if (!name || !username || !password) throw createError({ statusCode: 400, statusMessage: 'Name, username, and password are required.' })

  const id = crypto.randomUUID()
  const hashedPassword = await bcrypt.hash(password, 10)
  const initialHcp = parseFloat(handicapIndex) || 18.0

  const count = (await db.execute('SELECT COUNT(*) as count FROM players')).rows[0] as unknown as { count: number }

  let role: string = DEFAULT_ROLE
  if (count.count === 0) {
    role = FIRST_USER_ROLE
  } else if (requestedRole && Object.values(USER_ROLES).includes(requestedRole)) {
    // Only allow explicit role assignment when invoked by an authenticated admin
    const authUserId = getAuthUserId(event)
    if (authUserId) {
      const requester = (await db.execute('SELECT role FROM players WHERE id = ?', [authUserId])).rows[0] as any
      if (requester && isAdminRole(requester.role)) {
        role = requestedRole
      }
    }
  }

  try {
    await db.execute(`INSERT INTO players (id, name, username, password, handicapIndex, nextRoundPenalty, role, active) VALUES (?, ?, ?, ?, ?, 0.0, ?, 1)`, [id, name.trim(), username.trim().toLowerCase(), hashedPassword, initialHcp, role])

    setCookie(event, 'auth_user_id', id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    return { success: true, role }
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE')) throw createError({ statusCode: 400, statusMessage: 'Username is already taken.' })
    throw createError({ statusCode: 500, statusMessage: 'Registration failed.' })
  }
})
