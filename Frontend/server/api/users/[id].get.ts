import { requireAuth, db, ok, handleError, readBody, createError } from '../../utils/api'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const targetId = event.context.params?.id
  if (!targetId) throw createError({ statusCode: 400, statusMessage: 'Missing player ID.' })

  try {
    const player = db.prepare(`SELECT id, name, username, handicapIndex, role, active FROM players WHERE id = ?`).get(targetId) as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player not found.' })

    const scorecards = db.prepare(`SELECT s.id, s.competitionId, s.courseId, s.holeScores, s.stablefordPoints, s.handicapBeforeRound, s.handicapAfterRound, s.createdAt, c.name as competitionTitle, c.date as competitionDate, crs.name as courseName, crs.location as courseLocation FROM scores s LEFT JOIN competitions c ON s.competitionId = c.id LEFT JOIN courses crs ON s.courseId = crs.id WHERE s.playerId = ? ORDER BY s.createdAt DESC`).all(targetId) as any[]

    const formatted = scorecards.map(sc => ({
      ...sc,
      isCompetition: !!sc.competitionId,
      competitionTitle: sc.competitionTitle || null,
      courseName: sc.courseName || sc.competitionTitle || 'Society Golf Course',
      courseLocation: sc.courseLocation || 'Home Course',
      playedAt: sc.createdAt || sc.competitionDate || new Date().toISOString()
    }))

    let friendshipStatus = 'SELF'
    if (authUserId !== targetId) {
      const f = db.prepare(`SELECT * FROM friendships WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?)`).get(authUserId, targetId, targetId, authUserId) as any
      if (f) {
        friendshipStatus = f.status === 'ACCEPTED' ? 'FRIENDS' : f.status === 'PENDING' ? (f.requesterId === authUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED') : 'NONE'
      } else friendshipStatus = 'NONE'
    }

    return ok({ data: { player, scorecards: formatted, friendshipStatus } })
  } catch (error) { handleError(error, 'Error loading profile.') }
})
