import { db, readBody, ok, handleError, USER_ROLES } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const id = event.context.params?.id
  const method = event.node.req.method
  if (method === 'PUT') {
    const body = await readBody(event)
    try {
      const role = body.role && Object.values(USER_ROLES).includes(body.role) ? body.role : undefined
      const sets: string[] = []
      const args: any[] = []
      if (body.handicapIndex !== undefined) { sets.push('handicapIndex = ?'); args.push(body.handicapIndex) }
      if (body.nextRoundPenalty !== undefined) { sets.push('nextRoundPenalty = ?'); args.push(body.nextRoundPenalty) }
      if (body.active !== undefined) { sets.push('active = ?'); args.push(body.active ? 1 : 0) }
      if (role !== undefined) { sets.push('role = ?'); args.push(role) }
      args.push(id)
      await db.execute(`UPDATE players SET ${sets.join(', ')} WHERE id = ?`, args)
      return ok({ success: true })
    } catch (e: any) { handleError(e, e.message) }
  }
})
