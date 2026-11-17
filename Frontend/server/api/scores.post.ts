import { requireAuth, db, readBody, createError, ok, handleError, getAuthUserId } from '../utils/api'
import { calculateEarlybirdsHandicapCut } from '../utils/handicap'
import type { HandicapBand } from '../utils/handicap'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, holeScores } = await readBody(event)
  if (!competitionId || !Array.isArray(holeScores) || holeScores.length !== 18)
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission data. Must include competition ID and 18 hole scores.' })

  try {
    const comp = (await db.execute('SELECT * FROM competitions WHERE id = ?', [competitionId])).rows[0] as any
    if (!comp || comp.status !== 'OPEN') throw createError({ statusCode: 400, statusMessage: 'Competition is closed or does not exist.' })

    const today: string = (new Date().toISOString().split('T')[0]) as string
    const compDate: string = (new Date(comp.date).toISOString().split('T')[0]) as string
    if (today < compDate) throw createError({ statusCode: 403, statusMessage: `Scorecards cannot be submitted yet. This competition unlocks on ${compDate}.` })

    const player = (await db.execute('SELECT * FROM players WHERE id = ?', [authUserId])).rows[0] as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player record not found.' })

    const holes = (await db.execute('SELECT * FROM holes ORDER BY holeNumber ASC')).rows as any[]
    const defaultHoles = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: i === 2 || i === 6 || i === 10 || i === 14 ? 3 : i === 3 || i === 7 || i === 11 || i === 16 ? 5 : 4, strokeIndex: i + 1 }))
    const courseHoles = holes.length === 18 ? holes : defaultHoles

    const handicapBeforeRound = player.handicapIndex
    const penalty = player.nextRoundPenalty || 0.0
    const playingHandicap = Math.round(handicapBeforeRound + penalty)

    // Fetch course-specific handicap bands
    let courseBands: HandicapBand[] | undefined
    if (comp.courseId) {
      const course = (await db.execute('SELECT handicapRules FROM courses WHERE id = ?', [comp.courseId])).rows[0] as any
      if (course?.handicapRules) {
        try {
          const parsed = typeof course.handicapRules === 'string' ? JSON.parse(course.handicapRules) : course.handicapRules
          courseBands = parsed.bands || parsed
        } catch { courseBands = undefined }
      }
    }

    let totalStablefordPoints = 0
    const twosDetected: number[] = []
    courseHoles.forEach((h: any, idx: number) => {
      const grossStrokes = holeScores[idx] || 0
      if (grossStrokes <= 0) return
      let shotsReceived = 0
      if (playingHandicap >= h.strokeIndex) shotsReceived += 1
      if (playingHandicap >= h.strokeIndex + 18) shotsReceived += 1
      const netScore = Math.max(1, grossStrokes - shotsReceived)
      const points = Math.max(0, Math.min((h.par - netScore) + 2, 5))
      totalStablefordPoints += points
      if (h.par === 3 && grossStrokes === 2) twosDetected.push(h.holeNumber)
    })

    const cutResult = calculateEarlybirdsHandicapCut(handicapBeforeRound, totalStablefordPoints, 'other', courseBands)
    const handicapAfterRound = cutResult.newHandicapIndex
    const scoreId = crypto.randomUUID()

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

    await db.batch([
      {
        sql: `INSERT INTO scores (id, competitionId, playerId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [scoreId, competitionId, player.id, JSON.stringify(holeScores), totalStablefordPoints, handicapBeforeRound, handicapAfterRound]
      },
      ...twosDetected.map((holeNum: number) => ({
        sql: `INSERT INTO twos (id, competitionId, playerId, holeNumber) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), competitionId, player.id, holeNum]
      })),
      {
        sql: `UPDATE players SET handicapIndex = ?, nextRoundPenalty = 0.0 WHERE id = ?`,
        args: [handicapAfterRound, player.id]
      }
    ])

    return ok({ data: { scoreId, stablefordPoints: totalStablefordPoints, handicapBeforeRound, handicapAfterRound, handicapDelta: -cutResult.cutAmount, twosCount: twosDetected.length, twosHoles: twosDetected } })
  } catch (error: any) { handleError(error) }
})
