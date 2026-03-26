function buildBlockExplanation(block) {
  const byType = {
    DATA_STEP: 'Creates/updates datasets through row-level transformations and conditional assignments.',
    PROC_SQL: 'Runs relational logic (select/join/filters) to derive target datasets.',
    PROC_SORT: 'Orders data and optionally removes duplicates by business keys.',
    PROC_SUMMARY: 'Aggregates measures by class dimensions.',
    MACRO: 'Encapsulates reusable SAS logic and parameters.',
  }
  return {
    block_id: block.id,
    type: block.type,
    sas_intent: byType[block.type] || 'Custom SAS logic block.',
    conversion_summary: `Converted ${block.type} using pattern-based PySpark mapping.`,
    conversion_confidence: block.conversion_confidence,
    business_impact: block.business_impact,
    next_steps: block.next_steps || [],
    assumptions:
      block.type === 'MACRO'
        ? ['Macro expansion is not fully implemented.', 'Manual review required before production use.']
        : ['Input/output datasets inferred from static parsing.', 'Complex dynamic code paths may require manual edits.'],
  }
}

function buildMigrationExplanation({
  blocks = [],
  warnings = [],
  overall_conversion_confidence,
  business_impact_summary,
  next_steps_recommendations,
}) {
  return {
    overview: `Detected ${blocks.length} SAS logical block(s). Overall conversion confidence: ${overall_conversion_confidence ?? 'n/a'}%.`,
    assumptions: [
      'This is pattern-based conversion focused on common migration constructs.',
      'Unsupported SAS runtime features require analyst review — outputs are not guaranteed equivalent.',
    ],
    warnings,
    overall_conversion_confidence,
    business_impact_summary,
    next_steps_recommendations,
    block_explanations: blocks.map(buildBlockExplanation),
  }
}

module.exports = {
  buildMigrationExplanation,
}
