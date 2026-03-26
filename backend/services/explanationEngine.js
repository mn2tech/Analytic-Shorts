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
    assumptions: block.type === 'MACRO'
      ? ['Macro expansion is not fully implemented in MVP.', 'Manual review required before production use.']
      : ['Input/output datasets inferred from static parsing.', 'Complex dynamic code paths may require manual edits.'],
  }
}

function buildMigrationExplanation({ blocks = [], warnings = [] }) {
  return {
    overview: `Detected ${blocks.length} SAS logical block(s) and produced PySpark conversion output.`,
    assumptions: [
      'This is pattern-based conversion focused on common migration constructs.',
      'Unsupported SAS runtime features require analyst review.',
    ],
    warnings,
    block_explanations: blocks.map(buildBlockExplanation),
  }
}

module.exports = {
  buildMigrationExplanation,
}
