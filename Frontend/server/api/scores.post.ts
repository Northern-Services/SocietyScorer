import { requireAuth, db, readBody, createError, ok, handleError, getAuthUserId } from '../utils/api'
import crypto from 'node:crypto'

export default defineEventHandler(async (event: any) => {
  requireAuth(event)
  const authUserId = getAuthUserId(event)
  const { competitionId, holeScores } = await readBody(event)
  if (!competitionId || !Array.isArray(holeScores) || holeScores.length !== 18)
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission data. Must include competition ID and 18 hole scores.' })

  try {
    const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(competitionId) as any
    if (!comp || comp.status !== 'OPEN') throw createError({ statusCode: 400, statusMessage: 'Competition is closed or does not exist.' })

    const today: string = (new Date().toISOString().split('T')[0]) as string
    const compDate: string = (new Date(comp.date).toISOString().split('T')[0]) as string
    if (today < compDate) throw createError({ statusCode: 403, statusMessage: `Scorecards cannot be submitted yet. This competition unlocks on ${compDate}.` })

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(authUserId) as any
    if (!player) throw createError({ statusCode: 404, statusMessage: 'Player record not found.' })

    const holes = db.prepare('SELECT * FROM holes ORDER BY holeNumber ASC').all() as any[]
    const defaultHoles = Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: i === 2 || i === 6 || i === 10 || i === 14 ? 3 : i === 3 || i === 7 || i === 11 || i === 16 ? 5 : 4, strokeIndex: i + 1 }))
    const courseHoles = holes.length === 18 ? holes : defaultHoles

    const handicapBeforeRound = player.handicapIndex
    const penalty = player.nextRoundPenalty || 0.0
    const playingHandicap = Math.round(handicapBeforeRound + penalty)

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

    let delta = 0.0
    if (totalStablefordPoints >= 40) delta = -2.0
    else if (totalStablefordPoints >= 37) delta = -1.0
    else if (totalStablefordPoints >= 35) delta = -0.5
    else if (totalStablefordPoints < 30) delta = +0.5

    const handicapAfterRound = Math.max(0.0, parseFloat((handicapBeforeRound + delta).toFixed(1)))
    const scoreId = crypto.randomUUID()

    db.transaction(() => {
      db.prepare(`INSERT INTO scores (id, competitionId, playerId, holeScores, stablefordPoints, handicapBeforeRound, handicapAfterRound) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(scoreId, competitionId, player.id, JSON.stringify(holeScores), totalStablefordPoints, handicapBeforeRound, handicapAfterRound)
      twosDetected.forEach((holeNum: number) => db.prepare(`INSERT INTO twos (id, competitionId, playerId, holeNumber) VALUES (?, ?, ?, ?)`).run(crypto.randomUUID(), competitionId, player.id, holeNum))
      db.prepare(`UPDATE players SET handicapIndex = ?, nextRoundPenalty = 0.0 WHERE id = ?`).run(handicapAfterRound, player.id)
    })()

    return ok({ data: { scoreId, stablefordPoints: totalStablefordPoints, handicapBeforeRound, handicapAfterRound, handicapDelta: delta, twosCount: twosDetected.length, twosHoles: twosDetected } })
  } catch (error: any) { handleError(error) }
})
