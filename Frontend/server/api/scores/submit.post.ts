import { db } from '../../utils/db'
import crypto from 'node:crypto'
import { calculatePlayingHandicap } from '../../utils/handicap'

export default defineEventHandler(async (event) => {
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please sign in.' })
  }

  const body = await readBody(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = body

  if (!courseId || !holeScores || !Array.isArray(holeScores)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid scorecard data provided.' })
  }

  // 1. Check if user exists
  const player = db.prepare(`
    SELECT handicapIndex, nextRoundPenalty FROM players WHERE id = ?
  `).get(authUserId) as any

  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Player profile not found.' })
  }

  // 2. Validate Foreign Keys safely before DB insert/update
  let validCompId: string | null = null
  if (competitionId) {
    const existingComp = db.prepare(`SELECT id FROM competitions WHERE id = ?`).get(competitionId) as any
    if (existingComp) {
      validCompId = existingComp.id
    }
  }

  let validCourseId: string = courseId
  const existingCourse = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(courseId) as any
  if (!existingCourse) {
    const fallbackCourse = db.prepare(`SELECT id FROM courses LIMIT 1`).get() as any
    if (fallbackCourse) {
      validCourseId = fallbackCourse.id
    }
  }

  const handicapBeforeRound = Number(player.handicapIndex || 18)
  const totalPts = Number(stablefordPoints || 0)
  const holeScoresJson = JSON.stringify(holeScores)

  try {
    // 3. Prevent Duplicates: Check if a score record already exists for this player & competition
    let existingScore = null
    if (validCompId) {
      existingScore = db.prepare(`
        SELECT id FROM scores WHERE playerId = ? AND competitionId = ?
      `).get(authUserId, validCompId) as any
    }

    let scorecardId: string

    if (existingScore) {
      // UPDATE existing record instead of inserting a duplicate row
      scorecardId = existingScore.id
      db.prepare(`
        UPDATE scores 
        SET courseId = ?,
            holeScores = ?,
            stablefordPoints = ?
        WHERE id = ?
      `).run(
        validCourseId,
        holeScoresJson,
        totalPts,
        scorecardId
      )
    } else {
      // INSERT new record if none exists
      scorecardId = crypto.randomUUID()
      db.prepare(`
        INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        scorecardId,
        authUserId,
        validCompId,
        validCourseId,
        holeScoresJson,
        totalPts,
        handicapBeforeRound,
        handicapBeforeRound
      )
    }

    // Clear next round penalty after round completion
    db.prepare(`UPDATE players SET nextRoundPenalty = 0.0 WHERE id = ?`).run(authUserId)

    return { success: true, scorecardId }
  } catch (err: any) {
    console.error('Failed to submit scorecard:', err)
    throw createError({ statusCode: 500, statusMessage: `Database Error: ${err.message}` })
  }
})