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
    return {
      block_id: block.id,
      block_type: block.type,
      sas_construct: map.sas,
      pyspark_construct: map.pyspark,
      notes:
        block.type === 'MACRO'
          ? 'Macro logic is partially converted in MVP mode.'
          : 'Pattern-based conversion applied.',
    }
  })
}

module.exports = {
  buildTransformationMap,
}
