import { requireAuth } from '../../utils/api'
import { db, readBody, createError, ok } from '../../utils/api'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  try {
    const { username, password } = await readBody(event)
    if (!username || !password) throw createError({ statusCode: 400, statusMessage: 'Username and password are required.' })

    const user = (await db.execute(`SELECT id, password, temp_password, must_change_password, active FROM players WHERE LOWER(username) = LOWER(?)`, [username.trim()])).rows[0] as any
    if (!user || !user.active) throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })

    let isValid = false
    let isTempPassword = false

    // If user has a pending temp password, validate against it instead
    if (user.must_change_password === 1 || user.must_change_password === true) {
      if (user.temp_password) {
        isValid = await bcrypt.compare(password, user.temp_password)
        isTempPassword = isValid
      }
    } else {
      isValid = await bcrypt.compare(password, user.password)
    }

    if (!isValid) throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })

    // Temp password login: require password reset before granting session
    if (isTempPassword) {
      return ok({ success: true, mustChangePassword: true, userId: user.id, username: user.username })
    }

    setCookie(event, 'auth_user_id', user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    return { success: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: err.message || 'Login failed.' })
  }
})
