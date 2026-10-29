import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = await readBody(event)
  if (!courseId || !holeScores || !Array.isArray(holeScores))
    throw createError({ statusCode: 400, statusMessage: 'Invalid scorecard data provided.' })

  try {
    const player = db.prepare(`SELECT handicapIndex, nextRoundPenalty FROM players WHERE id = ?`).get(authUserId) as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player profile not found.' })

    let validCompId: string | null = null
    if (competitionId) {
      const c = db.prepare(`SELECT id FROM competitions WHERE id = ?`).get(competitionId) as any
      if (c) validCompId = c.id
    }

    let validCourseId: string = courseId
    const course = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(courseId) as any
    if (!course) {
      const fb = db.prepare(`SELECT id FROM courses LIMIT 1`).get() as any
      if (fb) validCourseId = fb.id
    }

    const handicapBeforeRound = Number(player.handicapIndex || 18)
    const totalPts = Number(stablefordPoints || 0)
    const holeScoresJson = JSON.stringify(holeScores)

    let existingScore = null
    if (validCompId) existingScore = db.prepare(`SELECT id FROM scores WHERE playerId = ? AND competitionId = ?`).get(authUserId, validCompId) as any

    let scorecardId: string
    if (existingScore) {
      scorecardId = existingScore.id
      db.prepare(`UPDATE scores SET courseId = ?, holeScores = ?, stablefordPoints = ? WHERE id = ?`).run(validCourseId, holeScoresJson, totalPts, scorecardId)
    } else {
      scorecardId = crypto.randomUUID()
      db.prepare(`INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(scorecardId, authUserId, validCompId, validCourseId, holeScoresJson, totalPts, handicapBeforeRound, handicapBeforeRound)
    }

    db.prepare(`UPDATE players SET nextRoundPenalty = 0.0 WHERE id = ?`).run(authUserId)
    return ok({ scorecardId })
  } catch (err: any) { handleError(err, `Database Error: ${err.message}`) }
})
