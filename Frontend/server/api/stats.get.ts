import { db, ok, handleError } from '../utils/api'

export default defineEventHandler(async () => {
  try {
    const totalPlayers = (db.prepare('SELECT COUNT(*) as count FROM players').get() as any)?.count || 0
    const totalCompetitions = (db.prepare('SELECT COUNT(*) as count FROM competitions').get() as any)?.count || 0
    const totalPrizePool = (db.prepare('SELECT SUM(COALESCE(prize1st, 0) + COALESCE(prize2nd, 0) + COALESCE(prize3rd, 0)) as totalPool FROM competitions').get() as any)?.totalPool || 0
    return ok({ data: { totalPlayers, totalCompetitions, totalPrizePool } })
  } catch (error: any) { handleError(error, 'Failed to fetch metrics.') }
})
