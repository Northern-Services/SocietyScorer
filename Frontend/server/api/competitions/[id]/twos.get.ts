import { db, ok, handleError } from '../../../utils/api'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  if (!compId) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  try {
    // Ensure twos table exists (migration for existing DBs)
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS twos (
          id TEXT PRIMARY KEY,
          competitionId TEXT NOT NULL,
          playerId TEXT NOT NULL,
          holeNumber INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (competitionId) REFERENCES competitions(id),
          FOREIGN KEY (playerId) REFERENCES players(id),
          UNIQUE(competitionId, playerId, holeNumber)
        )
      `)
    } catch { /* table may already exist */ }
    const twos = (await db.execute(`
      SELECT t.id, t.playerId, t.holeNumber, p.name as playerName, p.username
      FROM twos t
      JOIN players p ON t.playerId = p.id
      WHERE t.competitionId = ?
      ORDER BY t.holeNumber ASC
    `, [compId])).rows as any[]
    return ok({ data: twos })
  } catch (e) { handleError(e) }
})
