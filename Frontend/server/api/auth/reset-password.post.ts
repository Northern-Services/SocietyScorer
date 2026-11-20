import { db, readBody, createError, ok, handleError } from '../../utils/api'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const { userId, tempPassword, newPassword, confirmPassword } = await readBody(event)

  if (!userId || !tempPassword || !newPassword || !confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'All fields are required.' })
  }

  if (newPassword !== confirmPassword) {
    throw createError({ statusCode: 400, statusMessage: 'New password and confirmation do not match.' })
  }

  if (newPassword.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'New password must be at least 6 characters.' })
  }

  try {
    const user = (await db.execute(`SELECT id, temp_password, must_change_password, active FROM players WHERE id = ?`, [userId])).rows[0] as any
    if (!user || !user.active) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    if (!user.must_change_password || !user.temp_password) {
      throw createError({ statusCode: 400, statusMessage: 'No pending password reset for this user.' })
    }

    const isValid = await bcrypt.compare(tempPassword, user.temp_password)
    if (!isValid) throw createError({ statusCode: 401, statusMessage: 'Invalid temporary password.' })

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await db.execute(
      `UPDATE players SET password = ?, temp_password = NULL, must_change_password = 0 WHERE id = ?`,
      [hashedPassword, userId]
    )

    setCookie(event, 'auth_user_id', userId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
    return ok({ success: true })
  } catch (err: any) { handleError(err) }
})
