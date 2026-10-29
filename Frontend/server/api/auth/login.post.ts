import { requireAuth } from '../../utils/api'
import { db, readBody, createError } from '../../utils/api'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event)
  if (!username || !password) throw createError({ statusCode: 400, statusMessage: 'Username and password are required.' })

  const user = db.prepare(`SELECT id, password, active FROM players WHERE LOWER(username) = LOWER(?)`).get(username.trim()) as any
  if (!user || !user.active) throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })

  setCookie(event, 'auth_user_id', user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return { success: true }
})
