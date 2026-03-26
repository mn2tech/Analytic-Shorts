const TYPE_MAP = {
  DATA_STEP: { sas: 'DATA step', pyspark: 'DataFrame transformations / withColumn' },
  PROC_SQL: { sas: 'PROC SQL', pyspark: 'spark.sql or DataFrame joins/select' },
  PROC_SORT: { sas: 'PROC SORT', pyspark: 'orderBy / dropDuplicates' },
  PROC_SUMMARY: { sas: 'PROC SUMMARY', pyspark: 'groupBy().agg()' },
  MACRO: { sas: 'SAS Macro', pyspark: 'Python function placeholder' },
}

function buildTransformationMap(blocks = []) {
  return blocks.map((block) => {
    const map = TYPE_MAP[block.type] || { sas: block.type, pyspark: 'Manual mapping required' }
    const conf = block.conversion_confidence
    const confNote =
      typeof conf === 'number'
        ? ` Block confidence ~${conf}% — ${conf < 60 ? 'manual review expected.' : 'spot-check critical paths.'}`
        : ''
    return {
      block_id: block.id,
      block_type: block.type,
      sas_construct: map.sas,
      pyspark_construct: map.pyspark,
      conversion_confidence: conf,
      notes:
        (block.type === 'MACRO'
          ? 'Macro logic is not auto-expanded; placeholder only.'
          : 'Pattern-based conversion applied.') + confNote,
    }
  })
}

module.exports = {
  buildTransformationMap,
}
