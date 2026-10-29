import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please sign in.' })
  }

  const targetId = event.context.params?.id
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing player ID.' })
  }

  try {
    const player = db.prepare(`
      SELECT id, name, username, handicapIndex, role, active
      FROM players WHERE id = ?
    `).get(targetId) as any

    if (!player) {
      throw createError({ statusCode: 404, statusMessage: 'Player not found.' })
    }

    let formattedScorecards: any[] = []
    try {
      const scorecards = db.prepare(`
        SELECT 
          s.id, 
          s.competitionId, 
          s.courseId, 
          s.holeScores,
          s.stablefordPoints, 
          s.handicapBeforeRound,
          s.handicapAfterRound,
          s.createdAt,
          c.name as competitionTitle, 
          c.date as competitionDate,
          crs.name as courseName,
          crs.location as courseLocation
        FROM scores s
        LEFT JOIN competitions c ON s.competitionId = c.id
        LEFT JOIN courses crs ON s.courseId = crs.id
        WHERE s.playerId = ?
        ORDER BY s.createdAt DESC
      `).all(targetId) as any[]

      formattedScorecards = scorecards.map(sc => ({
        ...sc,
        // Flag to distinguish Competition vs Normal Round
        isCompetition: !!sc.competitionId,
        competitionTitle: sc.competitionTitle || null,
        courseName: sc.courseName || sc.competitionTitle || 'Society Golf Course',
        courseLocation: sc.courseLocation || 'Home Course',
        playedAt: sc.createdAt || sc.competitionDate || new Date().toISOString()
      }))
    } catch (scoreErr) {
      console.warn('Could not fetch scores history:', scoreErr)
    }

    let friendshipStatus = 'SELF'
    if (authUserId !== targetId) {
      try {
        const friendship = db.prepare(`
          SELECT * FROM friendships 
          WHERE (requesterId = ? AND receiverId = ?) 
             OR (requesterId = ? AND receiverId = ?)
        `).get(authUserId, targetId, targetId, authUserId) as any

        if (friendship) {
          if (friendship.status === 'ACCEPTED') {
            friendshipStatus = 'FRIENDS'
          } else if (friendship.status === 'PENDING') {
            friendshipStatus = friendship.requesterId === authUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED'
          }
        } else {
          friendshipStatus = 'NONE'
        }
      } catch (friendErr) {
        console.warn('Friendships check skipped:', friendErr)
        friendshipStatus = 'NONE'
      }
    }

    return {
      success: true,
      data: {
        player,
        scorecards: formattedScorecards,
        friendshipStatus
      }
    }
  } catch (error: any) {
    console.error('CRITICAL Profile Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Error loading profile.'
    })
  }
})