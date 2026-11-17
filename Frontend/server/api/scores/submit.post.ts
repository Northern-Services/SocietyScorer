import { requireAuth, db, readBody, ok, handleError, createError, getAuthUserId } from '../../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, courseId, holeScores, stablefordPoints } = await readBody(event)
  if (!courseId || !holeScores || !Array.isArray(holeScores))
    throw createError({ statusCode: 400, statusMessage: 'Invalid scorecard data provided.' })

  try {
    const player = (await db.execute(`SELECT handicapIndex, nextRoundPenalty FROM players WHERE id = ?`, [authUserId])).rows[0] as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player profile not found.' })

    let validCompId: string | null = null
    if (competitionId) {
      const c = (await db.execute(`SELECT id FROM competitions WHERE id = ?`, [competitionId])).rows[0] as any
      if (c) validCompId = c.id
    }

    let validCourseId: string = courseId
    const course = (await db.execute(`SELECT id FROM courses WHERE id = ?`, [courseId])).rows[0] as any
    if (!course) {
      const fb = (await db.execute(`SELECT id FROM courses LIMIT 1`)).rows[0] as any
      if (fb) validCourseId = fb.id
    }

    const handicapBeforeRound = Number(player.handicapIndex || 18)
    const totalPts = Number(stablefordPoints || 0)
    const holeScoresJson = JSON.stringify(holeScores)

    let existingScore = null
    if (validCompId) existingScore = (await db.execute(`SELECT id FROM scores WHERE playerId = ? AND competitionId = ?`, [authUserId, validCompId])).rows[0] as any

    let scorecardId: string
    if (existingScore) {
      scorecardId = existingScore.id
      await db.execute(`UPDATE scores SET courseId = ?, holeScores = ?, stablefordPoints = ? WHERE id = ?`, [validCourseId, holeScoresJson, totalPts, scorecardId])
    } else {
      scorecardId = crypto.randomUUID()
      await db.execute(`INSERT INTO scores (id, playerId, competitionId, courseId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [scorecardId, authUserId, validCompId, validCourseId, holeScoresJson, totalPts, handicapBeforeRound, handicapBeforeRound])
    }

    await db.execute(`UPDATE players SET nextRoundPenalty = 0.0 WHERE id = ?`, [authUserId])
    return ok({ scorecardId })
  } catch (err: any) { handleError(err, `Database Error: ${err.message}`) }
})
