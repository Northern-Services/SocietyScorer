import { db, ok } from '../../utils/api'

export default defineEventHandler(async (event: any) => {
  const competitionId = event.context.params?.id
  const scores = (await db.execute(`SELECT s.*, p.name as playerName FROM scores s JOIN players p ON s.playerId = p.id WHERE s.competitionId = ? ORDER BY s.stablefordPoints DESC`, [competitionId])).rows
  return ok({ data: scores })
})
