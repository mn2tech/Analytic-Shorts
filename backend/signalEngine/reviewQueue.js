/**
 * NM2TECH Signal Engine - Review queue for low-confidence signals.
 * Internal name: nm2SignalEngine
 */

const { getSupabaseAdmin } = require('../utils/supabaseAdmin')
const { CONFIDENCE_THRESHOLD } = require('./resolver')

const TABLE_NAME = 'signal_review_queue'

/**
 * Add opportunity to review queue when any signal has confidence < threshold.
 * @param {Object} opportunity - Opportunity with noticeId or notice_id
 * @param {Object} signals - Output from resolveSignals()
 * @returns {Promise<{ added: boolean, rows: Array }>}
 */
async function addToReviewQueueIfNeeded(opportunity, signals) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { added: false, rows: [] }

  const opportunityId = opportunity.noticeId || opportunity.notice_id || opportunity.id || ''
  if (!opportunityId) return { added: false, rows: [] }

  const rows = []
  const signalsToCheck = [
    { label_type: 'vehicle_required', sig: signals.vehicle_required },
    { label_type: 'first_win_eligible', sig: signals.first_win_eligible },
    { label_type: 'set_aside_preferred', sig: signals.set_aside_preferred },
    { label_type: 'complexity_level', sig: signals.complexity_level },
  ]

  for (const { label_type, sig } of signalsToCheck) {
    if (sig.confidence < CONFIDENCE_THRESHOLD && sig.value != null) {
      const row = {
        opportunity_id: opportunityId,
        label_type: label_type,
        predicted_value: String(sig.value),
        confidence: sig.confidence,
        needs_review: true,
      }
      rows.push(row)
      try {
        const { error } = await supabase.from(TABLE_NAME).upsert(row, {
          onConflict: 'opportunity_id,label_type',
        })
        if (error) console.warn('[nm2SignalEngine] Review queue upsert failed:', error.message)
      } catch (err) {
        console.warn('[nm2SignalEngine] Review queue insert failed:', err?.message)
      }
    }
  }

  return { added: rows.length > 0, rows }
}

module.exports = {
  addToReviewQueueIfNeeded,
  TABLE_NAME,
}
