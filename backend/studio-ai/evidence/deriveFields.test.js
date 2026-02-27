const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { deriveFields, findColumn } = require('./deriveFields')

function profile(columns) {
  return { columns: columns.map((c) => ({ name: c })) }
}

describe('deriveFields', () => {
  it('returns same rows and no added columns when no quantity/price columns', () => {
    const rows = [{ a: 1 }, { a: 2 }]
    const p = profile(['a', 'b'])
    const { rows: out, addedColumns } = deriveFields(rows, p)
    assert.strictEqual(out, rows)
    assert.deepEqual(addedColumns, [])
  })

  it('adds gross and revenue when quantity and unit_price exist', () => {
    const rows = [
      { quantity: 2, unit_price: 10 },
      { quantity: 3, unit_price: 5 },
    ]
    const p = profile(['quantity', 'unit_price'])
    const { rows: out, addedColumns } = deriveFields(rows, p)
    assert.equal(out[0].gross, 20)
    assert.equal(out[0].revenue, 20)
    assert.equal(out[1].gross, 15)
    assert.equal(out[1].revenue, 15)
    assert.deepEqual(addedColumns, [
      { name: 'gross', inferredType: 'number' },
      { name: 'revenue', inferredType: 'number' },
    ])
  })

  it('uses gross - discount for revenue when discount column exists', () => {
    const rows = [
      { quantity: 2, unit_price: 10, discount: 1 },
      { quantity: 1, unit_price: 100, discount: 10 },
    ]
    const p = profile(['quantity', 'unit_price', 'discount'])
    const { rows: out } = deriveFields(rows, p)
    assert.equal(out[0].gross, 20)
    assert.equal(out[0].revenue, 19)
    assert.equal(out[1].gross, 100)
    assert.equal(out[1].revenue, 90)
  })

  it('finds column by alias (qty, price)', () => {
    const rows = [{ qty: 4, price: 25 }]
    const p = profile(['qty', 'price'])
    const { rows: out, addedColumns } = deriveFields(rows, p)
    assert.equal(out[0].gross, 100)
    assert.equal(out[0].revenue, 100)
    assert.ok(addedColumns.length >= 1)
  })

  it('adds revenue when only unit_price (no quantity): revenue = unit_price - discount or unit_price', () => {
    const rows = [
      { unit_price: 100 },
      { unit_price: 50, discount: 10 },
    ]
    const p = profile(['unit_price', 'discount'])
    const { rows: out, addedColumns } = deriveFields(rows, p)
    assert.equal(out[0].revenue, 100)
    assert.equal(out[1].revenue, 40)
    assert.deepEqual(addedColumns, [{ name: 'revenue', inferredType: 'number' }])
  })
})

describe('findColumn', () => {
  const p = profile(['Quantity', 'Unit_Price', 'Discount_Amount'])
  it('returns first matching column name (case-insensitive)', () => {
    assert.equal(findColumn(p, 'quantity', 'qty'), 'Quantity')
    assert.equal(findColumn(p, 'unit_price', 'price'), 'Unit_Price')
    assert.equal(findColumn(p, 'discount'), 'Discount_Amount')
  })
  it('returns null when no match', () => {
    assert.equal(findColumn(p, 'revenue', 'sales'), null)
  })
})
