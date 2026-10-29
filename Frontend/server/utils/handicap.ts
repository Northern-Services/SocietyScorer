/**
 * Earlybirds WHS Playing Handicap Rounder
 * .5 values round UP to the next integer.
 */
export function calculatePlayingHandicap(handicapIndex: number, nextRoundPenalty: number = 0): number {
  const base = Math.round(Number(handicapIndex) || 0)
  return Math.max(0, base + Math.round(Number(nextRoundPenalty) || 0))
}

/**
 * Calculates handicap stroke allocation for a single hole based on Stroke Index.
 */
export function getShotsReceived(playingHandicap: number, holeSI: number): number {
  let shots = 0
  if (playingHandicap >= holeSI) shots += 1
  if (playingHandicap >= holeSI + 18) shots += 1
  if (playingHandicap >= holeSI + 36) shots += 1
  return shots
}

/**
 * Calculates Net Score and Stableford points for a single hole.
 */
export function calculateHoleStableford(
  grossStrokes: number | null | undefined,
  par: number,
  strokeIndex: number,
  playingHandicap: number
) {
  if (!grossStrokes || grossStrokes <= 0) {
    return { shotsReceived: getShotsReceived(playingHandicap, strokeIndex), netScore: null, points: 0 }
  }

  const shotsReceived = getShotsReceived(playingHandicap, strokeIndex)
  const netScore = grossStrokes - shotsReceived
  const diff = par - netScore

  let points = 0
  if (diff === -1) points = 1       // Net Bogey
  else if (diff === 0) points = 2   // Net Par
  else if (diff === 1) points = 3   // Net Birdie
  else if (diff === 2) points = 4   // Net Eagle
  else if (diff === 3) points = 5   // Net Albatross
  else if (diff >= 4) points = 6    // Net Condor / Exceptional
  else points = 0                   // Net Double Bogey or worse

  return {
    shotsReceived,
    netScore,
    points
  }
}

export interface HoleDefinition {
  holeNumber: number
  par: number
  si: number
}

/**
 * Processes complete 18-hole score array and returns full breakdown totals.
 */
export function calculateFullScorecard(
  grossStrokesArray: (number | null)[],
  courseHoles: HoleDefinition[],
  playingHandicap: number
) {
  let front9Points = 0
  let back9Points = 0
  let totalStrokes = 0
  let holesCompleted = 0
  let runningTotal = 0

  const holeBreakdowns = courseHoles.map((hole, idx) => {
    const strokes = grossStrokesArray[idx] ?? null
    const calc = calculateHoleStableford(strokes, hole.par, hole.si, playingHandicap)

    if (strokes && strokes > 0) {
      holesCompleted++
      totalStrokes += strokes
      runningTotal += calc.points

      if (hole.holeNumber <= 9) {
        front9Points += calc.points
      } else {
        back9Points += calc.points
      }
    }

    return {
      holeNumber: hole.holeNumber,
      par: hole.par,
      si: hole.si,
      strokes,
      shotsReceived: calc.shotsReceived,
      netScore: calc.netScore,
      points: calc.points,
      runningTotal
    }
  })

  return {
    front9Points,
    back9Points,
    totalPoints: front9Points + back9Points,
    totalStrokes,
    holesCompleted,
    holes: holeBreakdowns
  }
}

/**
 * Post-round Earlybirds Handicap Cut & Penalty Logic
 * Called strictly AFTER round submission.
 */
export function calculateEarlybirdsHandicapCut(
  currentHandicapIndex: number,
  totalStablefordPoints: number,
  podiumFinish: '1st' | '2nd' | '3rd' | 'other' = 'other'
) {
  let bandRate = 0.8 // Default band 4 (HCP 19-32)
  if (currentHandicapIndex <= 6) bandRate = 0.2
  else if (currentHandicapIndex <= 12) bandRate = 0.4
  else if (currentHandicapIndex <= 18) bandRate = 0.6

  // 1. Calculate Cut for points over 36
  let cutAmount = 0
  if (totalStablefordPoints > 36) {
    cutAmount = (totalStablefordPoints - 36) * bandRate
  }

  // 2. Determine Next-Round Closing Penalty
  let nextRoundPenalty = 0
  if (podiumFinish === '1st') nextRoundPenalty = -3
  else if (podiumFinish === '2nd') nextRoundPenalty = -2
  else if (podiumFinish === '3rd') nextRoundPenalty = -1

  const newHandicapIndex = Math.max(0, Number((currentHandicapIndex - cutAmount).toFixed(1)))

  return {
    pointsOver36: Math.max(0, totalStablefordPoints - 36),
    bandRateApplied: bandRate,
    cutAmount: Number(cutAmount.toFixed(1)),
    newHandicapIndex,
    nextRoundPenalty
  }
}