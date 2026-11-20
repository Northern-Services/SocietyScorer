import { requireAuth, requireAdmin, db, ok, handleError, createError } from '../../../utils/api'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing player ID.' })

  await requireAuth(event)
  await requireAdmin(event)

  try {
    const player = (await db.execute(`SELECT id, username, name FROM players WHERE id = ?`, [id])).rows[0] as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found.' })

    // Generate a random temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex') // 12 char hex string
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10)

    await db.execute(
      `UPDATE players SET temp_password = ?, must_change_password = 1 WHERE id = ?`,
      [hashedTempPassword, id]
    )

    return ok({ success: true, tempPassword, username: player.username, name: player.name })
  } catch (err: any) { handleError(err) }
})
