import { db, ok, handleError } from '../utils/api'

export default defineEventHandler(async () => {
  try {
    const totalPlayers = ((await db.execute('SELECT COUNT(*) as count FROM players')).rows[0] as any)?.count || 0
    const totalCompetitions = ((await db.execute('SELECT COUNT(*) as count FROM competitions')).rows[0] as any)?.count || 0
    const totalPrizePool = ((await db.execute('SELECT SUM(COALESCE(prize1st, 0) + COALESCE(prize2nd, 0) + COALESCE(prize3rd, 0)) as totalPool FROM competitions')).rows[0] as any)?.totalPool || 0
    return ok({ data: { totalPlayers, totalCompetitions, totalPrizePool } })
  } catch (error: any) { handleError(error, 'Failed to fetch metrics.') }
})
