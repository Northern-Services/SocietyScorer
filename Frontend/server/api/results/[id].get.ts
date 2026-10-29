import { db, ok } from '../../utils/api'

export default defineEventHandler((event: any) => {
  const competitionId = event.context.params?.id
  const scores = db.prepare(`SELECT s.*, p.name as playerName FROM scores s JOIN players p ON s.playerId = p.id WHERE s.competitionId = ? ORDER BY s.stablefordPoints DESC`).all(competitionId)
  return ok({ data: scores })
})
