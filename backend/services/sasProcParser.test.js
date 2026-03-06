const test = require('node:test')
const assert = require('node:assert/strict')
const { parse } = require('./sasProcParser')

test('summary basic', () => {
  const r = parse('PROC SUMMARY DATA=work.sales NWAY;\n  CLASS region product;\n  VAR revenue units;\n  OUTPUT OUT=work.out MEAN= SUM= N=;\nRUN;')
  assert.equal(r.success, true)
  assert.equal(r.spec.task, 'summary')
  assert.deepEqual(r.spec.group_by, ['region', 'product'])
  assert.ok(r.spec.metrics.length >= 2)
  assert.equal(r.spec.options.nway, true)
})

test('summary with class var output', () => {
  const r = parse('PROC SUMMARY;\n  CLASS Category Region;\n  VAR Sales Units;\n  OUTPUT OUT=out MEAN= SUM= N=;\nRUN;')
  assert.equal(r.success, true)
  assert.deepEqual(r.spec.group_by, ['Category', 'Region'])
  assert.ok(r.spec.metrics.some(m => m.col === 'Sales'))
})

test('means alias', () => {
  const r = parse('PROC MEANS DATA=work.sales;\n  VAR revenue units;\nRUN;')
  assert.equal(r.success, true)
  assert.equal(r.spec.task, 'summary')
})

test('freq multiple tables', () => {
  const r = parse('PROC FREQ DATA=work.sales;\n  TABLES status region;\nRUN;')
  assert.equal(r.success, true)
  assert.equal(r.spec.task, 'freq')
  assert.deepEqual(r.spec.columns, ['status', 'region'])
  assert.ok(r.spec.outputs && r.spec.outputs.length === 2)
})

test('reject unsupported proc', () => {
  const r = parse('PROC SQL;\n  SELECT * FROM x;\nRUN;')
  assert.equal(r.success, false)
  assert.ok(r.errors.some(e => e.code === 'UNSUPPORTED_SYNTAX' && /PROC SQL/i.test(e.message)))
})

test('reject data step', () => {
  const r = parse('DATA x;\n  set y;\nRUN;')
  assert.equal(r.success, false)
  assert.ok(r.errors.some(e => /DATA step/i.test(e.message)))
})

test('reject macros', () => {
  const r = parse('%macro foo;\n%mend;')
  assert.equal(r.success, false)
  assert.ok(r.errors.some(e => /Macro/i.test(e.message)))
})

test('reject %include', () => {
  const r = parse('%include "/path/to/file.sas";')
  assert.equal(r.success, false)
  assert.ok(r.errors.some(e => /include/i.test(e.message)))
})
