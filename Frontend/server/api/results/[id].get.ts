import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const competitionId = event.context.params?.id

  const scores = db.prepare(`
    SELECT s.*, p.name as playerName 
    FROM scores s
    JOIN players p ON s.playerId = p.id
    WHERE s.competitionId = ?
    ORDER BY s.stablefordPoints DESC
  `).all(competitionId)

  return { success: true, data: scores }
})