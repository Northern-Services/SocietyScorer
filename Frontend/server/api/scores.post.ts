import { db } from '../utils/db'
import crypto from 'node:crypto'

export default defineEventHandler(async (event) => {
  // 1. Authenticate user via session cookie
  const authUserId = getCookie(event, 'auth_user_id')
  if (!authUserId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized. Please sign in.' })
  }

  const body = await readBody(event)
  const { competitionId, holeScores } = body

  if (!competitionId || !Array.isArray(holeScores) || holeScores.length !== 18) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid submission data. Must include competition ID and 18 hole scores.'
    })
  }

  // 2. Fetch Competition, Player, and 18-hole course settings from SQLite
  const comp = db.prepare('SELECT * FROM competitions WHERE id = ?').get(competitionId) as any
  if (!comp || comp.status !== 'OPEN') {
    throw createError({ statusCode: 400, statusMessage: 'Competition is closed or does not exist.' })
  }

  // Date Guard: Prevent score submission before competition day
  const todayStr = new Date().toISOString().split('T')[0]
  const compDateStr = new Date(comp.date).toISOString().split('T')[0]

  if (todayStr < compDateStr) {
    const d = new Date(comp.date)
    const formattedCompDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    throw createError({ 
      statusCode: 403, 
      statusMessage: `Scorecards cannot be submitted yet. This competition unlocks on ${formattedCompDate}.` 
    })
  }

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(authUserId) as any
  if (!player) {
    throw createError({ statusCode: 404, statusMessage: 'Player record not found.' })
  }

  // Fetch standard course holes (1 to 18)
  const holes = db.prepare('SELECT * FROM holes ORDER BY holeNumber ASC').all() as any[]
  
  // Default course preset fallback if holes table is empty
  const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: i === 2 || i === 6 || i === 10 || i === 14 ? 3 : i === 3 || i === 7 || i === 11 || i === 16 ? 5 : 4,
    strokeIndex: i + 1
  }))
  const courseHoles = holes.length === 18 ? holes : defaultHoles

  // 3. Calculate Playing Handicap (Index + Penalty Strokes)
  const handicapBeforeRound = player.handicapIndex
  const penalty = player.nextRoundPenalty || 0.0
  const playingHandicap = Math.round(handicapBeforeRound + penalty)

  // 4. Compute Stableford Points and detect 2's Club triggers
  let totalStablefordPoints = 0
  const twosDetected: number[] = []

  courseHoles.forEach((h, idx) => {
    const grossStrokes = holeScores[idx] || 0
    if (grossStrokes <= 0) return

    // Stroke index allocation
    let shotsReceived = 0
    if (playingHandicap >= h.strokeIndex) shotsReceived += 1
    if (playingHandicap >= h.strokeIndex + 18) shotsReceived += 1

    const netScore = Math.max(1, grossStrokes - shotsReceived)
    const points = Math.max(0, Math.min((h.par - netScore) + 2, 5))
    totalStablefordPoints += points

    // Detect 2's Club trigger (Score of 2 on a Par 3)
    if (h.par === 3 && grossStrokes === 2) {
      twosDetected.push(h.holeNumber)
    }
  })

  // 5. Determine Post-Round Handicap Adjustment Rule
  let delta = 0.0
  if (totalStablefordPoints >= 40) {
    delta = -2.0 // Big Cut
  } else if (totalStablefordPoints >= 37) {
    delta = -1.0 // Medium Cut
  } else if (totalStablefordPoints >= 35) {
    delta = -0.5 // Small Cut
  } else if (totalStablefordPoints < 30) {
    delta = +0.5 // Small Increase
  }

  const handicapAfterRound = Math.max(0.0, parseFloat((handicapBeforeRound + delta).toFixed(1)))

  // 6. Execute Atomic Database Updates
  const scoreId = crypto.randomUUID()

  const saveScoreTx = db.transaction(() => {
    // Save Scorecard entry
    db.prepare(`
      INSERT INTO scores (
        id, competitionId, playerId, holeScores, 
        stablefordPoints, handicapBeforeRound, handicapAfterRound
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      scoreId,
      competitionId,
      player.id,
      JSON.stringify(holeScores),
      totalStablefordPoints,
      handicapBeforeRound,
      handicapAfterRound
    )

    // Log 2's Pot entries if qualified
    twosDetected.forEach((holeNum) => {
      db.prepare(`
        INSERT INTO twos (id, competitionId, playerId, holeNumber)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), competitionId, player.id, holeNum)
    })

    // Update Player's WHS Handicap Index and reset next round penalty strokes
    db.prepare(`
      UPDATE players 
      SET handicapIndex = ?, nextRoundPenalty = 0.0
      WHERE id = ?
    `).run(handicapAfterRound, player.id)
  })

  try {
    saveScoreTx()

    return {
      success: true,
      data: {
        scoreId,
        stablefordPoints: totalStablefordPoints,
        handicapBeforeRound,
        handicapAfterRound,
        handicapDelta: delta,
        twosCount: twosDetected.length,
        twosHoles: twosDetected
      }
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})