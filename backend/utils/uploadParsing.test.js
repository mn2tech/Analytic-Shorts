const test = require('node:test')
const assert = require('node:assert/strict')

const { unpackSingleColumnCsvLines } = require('./uploadParsing')

test('upload parsing: unpack single-column CSV lines into multiple columns', () => {
  const rows = [
    { 'date,rooms_available,adr': '2026-01-01,10,"$1,200"' },
    { 'date,rooms_available,adr': '2026-01-02,12,145' },
  ]
  const out = unpackSingleColumnCsvLines(rows)
  assert.ok(Array.isArray(out))
  assert.deepEqual(Object.keys(out[0]).sort(), ['adr', 'date', 'rooms_available'].sort())
  assert.equal(out[0].date, '2026-01-01')
  assert.equal(out[0].rooms_available, '10')
  assert.equal(out[0].adr, '$1,200')
})

