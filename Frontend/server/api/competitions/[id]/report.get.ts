import { requireAuth, requireAdmin, db, readBody, ok, handleError, createError, getAuthUserId, setHeader } from '../../../utils/api'
import PDFDocument from 'pdfkit'

export default defineEventHandler(async (event) => {
  const compId = event.context.params?.id
  const authUserId = getAuthUserId(event)
  if (!compId) throw createError({ statusCode: 400, statusMessage: 'Missing competition ID.' })
  if (!authUserId) throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
  requireAdmin(event)
  const competition = db.prepare(`SELECT * FROM competitions WHERE id = ?`).get(compId) as any
  if (!competition) throw createError({ statusCode: 404, statusMessage: 'Competition not found.' })
  try {
    const leaderboards = db.prepare(`SELECT s.id as scorecardId, s.playerId, p.name as playerName, COALESCE(p.handicapIndex, 0) as handicapIndex, COALESCE(s.stablefordPoints, 0) as stablefordPoints, s.holeScores FROM scores s JOIN players p ON s.playerId = p.id WHERE s.competitionId = ? ORDER BY s.stablefordPoints DESC`).all(compId) as any[]
    let currentRank = 1
    const ranked = leaderboards.map((entry, i) => {
      if (i > 0 && entry.stablefordPoints < leaderboards[i - 1].stablefordPoints) currentRank = i + 1
      let prizeAmount = 0, prizeLabel = ''
      if (currentRank === 1 && competition.prize1st) { prizeAmount = competition.prize1st; prizeLabel = `1st Place (£${competition.prize1st})` }
      else if (currentRank === 2 && competition.prize2nd) { prizeAmount = competition.prize2nd; prizeLabel = `2nd Place (£${competition.prize2nd})` }
      else if (currentRank === 3 && competition.prize3rd) { prizeAmount = competition.prize3rd; prizeLabel = `3rd Place (£${competition.prize3rd})` }
      let parsed = {}
      try { parsed = typeof entry.holeScores === 'string' ? JSON.parse(entry.holeScores) : (entry.holeScores || {}) } catch { parsed = {} }
      return { ...entry, rank: currentRank, prizeAmount, prizeLabel, scoresParsed: parsed }
    })
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      const chunks: Buffer[] = []
      doc.on('data', c => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks))).on('error', reject)
      doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('ppulse.cc — Official Competition Report').moveDown(0.2)
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669').text(competition.name).fontSize(9).font('Helvetica').fillColor('#64748b').text(`Venue: ${competition.venue}  |  Date: ${new Date(competition.date).toLocaleDateString()}  |  Status: ${competition.status}`).moveDown(0.8)
      const boxY = doc.y
      doc.rect(40, boxY, 515, 38).fillAndStroke('#f8fafc', '#cbd5e1').fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('Prize Pool Allocation Summary', 50, boxY + 6).fontSize(8.5).font('Helvetica').text(`1st Place: £${competition.prize1st || 0}   |   2nd Place: £${competition.prize2nd || 0}   |   3rd Place: £${competition.prize3rd || 0}`, 50, boxY + 20)
      doc.y = boxY + 48
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Final Standings, Scorecards & Prize Payouts').moveDown(0.4)
      if (ranked.length === 0) doc.fontSize(9.5).font('Helvetica').fillColor('#64748b').text('No completed player scorecards found for this competition.')
      else ranked.forEach(entry => {
        if (doc.y > 680) doc.addPage()
        const cardY = doc.y
        doc.rect(40, cardY, 515, 22).fill('#e2e8f0').fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(`#${entry.rank} - ${entry.playerName}`, 48, cardY + 6).text(`Total: ${entry.stablefordPoints} pts`, 240, cardY + 6).fillColor(entry.prizeAmount > 0 ? '#b45309' : '#64748b').text(entry.prizeLabel || 'No Prize', 380, cardY + 6, { align: 'right', width: 165 })
        doc.y = cardY + 26
        doc.fontSize(7.5).font('Helvetica')
        let scoreX = 48, scoreY = doc.y
        for (let h = 1; h <= 18; h++) {
          const stroke = entry.scoresParsed[h] !== undefined ? entry.scoresParsed[h] : '-'
          doc.rect(scoreX, scoreY, 26, 18).stroke('#cbd5e1').fillColor('#64748b').text(`H${h}`, scoreX + 2, scoreY + 2, { width: 22, align: 'center' }).fillColor('#0f172a').font('Helvetica-Bold').text(`${stroke}`, scoreX + 2, scoreY + 10, { width: 22, align: 'center' }).font('Helvetica')
          scoreX += 27
          if (h === 9) { scoreX = 48; scoreY += 20 }
        }
        doc.y = scoreY + 26
        doc.moveDown(0.5)
      })
      doc.end()
    })
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="${competition.name.replace(/\s+/g, '_')}_Report.pdf"`)
    return pdfBuffer
  } catch (e) { handleError(e) }
})
