/**
 * Model Scoring API validation tests
 */
const test = require('node:test')
const assert = require('node:assert/strict')

test('modelsController - createModel validation: missing name', () => {
  const { createModel } = require('../controllers/modelsController')
  const req = { body: { format: 'joblib' }, user: { id: 'test-user' } }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.equal(body.error, 'name is required')
        return res
      },
    }),
  }
  createModel(req, res)
})

test('modelsController - createModel validation: invalid format', () => {
  const { createModel } = require('../controllers/modelsController')
  const req = { body: { name: 'm1', format: 'invalid' }, user: { id: 'test-user' } }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.equal(body.error, 'Invalid format')
        assert.ok(Array.isArray(body.allowed))
        return res
      },
    }),
  }
  createModel(req, res)
})

test('scoreController - score validation: missing model_id', async () => {
  const { score } = require('../controllers/scoreController')
  const req = {
    body: { input: { type: 'inline_json', data: [] } },
    user: { id: 'test-user' },
  }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.equal(body.error, 'model_id is required')
        return res
      },
    }),
  }
  await score(req, res)
})

test('scoreController - score validation: missing input', async () => {
  const { score } = require('../controllers/scoreController')
  const req = {
    body: { model_id: 'some-id' },
    user: { id: 'test-user' },
  }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.ok(body.error && /input/i.test(body.error))
        return res
      },
    }),
  }
  await score(req, res)
})

test('scoreController - score validation: input.data not array', async () => {
  const { score } = require('../controllers/scoreController')
  const req = {
    body: {
      model_id: 'some-id',
      input: { type: 'inline_json', data: 'not-an-array' },
    },
    user: { id: 'test-user' },
  }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.ok(body.error && /array/i.test(body.error))
        return res
      },
    }),
  }
  await score(req, res)
})

test('scoreController - score validation: input.data row not object', async () => {
  const { score } = require('../controllers/scoreController')
  const req = {
    body: {
      model_id: 'some-id',
      input: { type: 'inline_json', data: [{ x: 1 }, 'not-object'] },
    },
    user: { id: 'test-user' },
  }
  const res = {
    status: (code) => ({
      json: (body) => {
        assert.equal(code, 400)
        assert.ok(body.error && /input\.data\[1\]/i.test(body.error))
        return res
      },
    }),
  }
  await score(req, res)
})
