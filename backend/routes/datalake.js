/**
 * Data Lake API – persist and list datasets for the report builder.
 * Files stored under backend/data-lake/ (index.json + {id}.json per dataset).
 */

const express = require('express')
const path = require('path')
const fs = require('fs')

const router = express.Router()
const DATA_LAKE_DIR = path.join(__dirname, '..', 'data-lake')
const INDEX_FILE = path.join(DATA_LAKE_DIR, 'index.json')

function ensureDataLakeDir() {
  if (!fs.existsSync(DATA_LAKE_DIR)) {
    fs.mkdirSync(DATA_LAKE_DIR, { recursive: true })
  }
}

function readIndex() {
  ensureDataLakeDir()
  if (!fs.existsSync(INDEX_FILE)) {
    return { datasets: [] }
  }
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8')
    const out = JSON.parse(raw)
    return Array.isArray(out.datasets) ? out : { datasets: [] }
  } catch {
    return { datasets: [] }
  }
}

function writeIndex(index) {
  ensureDataLakeDir()
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')
}

function safeId(name) {
  return (name || 'dataset')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase() || 'dataset'
}

function nextId(datasets) {
  const used = new Set(datasets.map((d) => d.id))
  let n = 1
  while (used.has(`dataset-${n}`)) n++
  return `dataset-${n}`
}

// GET /api/datalake – list all datasets in the lake
router.get('/', (req, res) => {
  try {
    const index = readIndex()
    res.json(index)
  } catch (err) {
    console.error('Data lake list error:', err)
    res.status(500).json({ error: err.message || 'Failed to list data lake' })
  }
})

// GET /api/datalake/:id – get one dataset (data + schema)
router.get('/:id', (req, res) => {
  try {
    const id = (req.params.id || '').replace(/[^a-zA-Z0-9-_]/g, '')
    if (!id) return res.status(400).json({ error: 'Missing dataset id' })
    const filePath = path.join(DATA_LAKE_DIR, `${id}.json`)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Dataset not found' })
    const raw = fs.readFileSync(filePath, 'utf-8')
    const payload = JSON.parse(raw)
    res.json({
      data: payload.data || [],
      columns: payload.columns || [],
      numericColumns: payload.numericColumns || [],
      categoricalColumns: payload.categoricalColumns || [],
      dateColumns: payload.dateColumns || [],
      rowCount: payload.rowCount ?? (payload.data || []).length,
    })
  } catch (err) {
    console.error('Data lake get error:', err)
    res.status(500).json({ error: err.message || 'Failed to get dataset' })
  }
})

// POST /api/datalake – save a new dataset to the lake
router.post('/', (req, res) => {
  try {
    const { name, data, columns, numericColumns, categoricalColumns, dateColumns } = req.body || {}
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Missing or empty data' })
    }
    const cols = Array.isArray(columns) && columns.length > 0 ? columns : Object.keys(data[0] || {})
    const index = readIndex()
    const baseId = safeId(name)
    let id = baseId
    let n = 1
    while (index.datasets.some((d) => d.id === id)) {
      id = `${baseId}-${n++}`
    }
    if (id !== baseId && !name) id = nextId(index.datasets)
    const rowCount = data.length
    const datasetMeta = {
      id,
      name: (name || id).trim() || id,
      rowCount,
      columns: cols,
      createdAt: new Date().toISOString(),
    }
    const payload = {
      data,
      columns: cols,
      numericColumns: Array.isArray(numericColumns) ? numericColumns : [],
      categoricalColumns: Array.isArray(categoricalColumns) ? categoricalColumns : [],
      dateColumns: Array.isArray(dateColumns) ? dateColumns : [],
      rowCount,
    }
    ensureDataLakeDir()
    fs.writeFileSync(path.join(DATA_LAKE_DIR, `${id}.json`), JSON.stringify(payload), 'utf-8')
    index.datasets.push(datasetMeta)
    writeIndex(index)
    res.status(201).json({ id, name: datasetMeta.name, rowCount, columns: cols })
  } catch (err) {
    console.error('Data lake save error:', err)
    res.status(500).json({ error: err.message || 'Failed to save to data lake' })
  }
})

// DELETE /api/datalake/:id – remove a dataset from the lake
router.delete('/:id', (req, res) => {
  try {
    const id = (req.params.id || '').replace(/[^a-zA-Z0-9-_]/g, '')
    if (!id) return res.status(400).json({ error: 'Missing dataset id' })
    const index = readIndex()
    const idx = index.datasets.findIndex((d) => d.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Dataset not found' })
    const filePath = path.join(DATA_LAKE_DIR, `${id}.json`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    index.datasets.splice(idx, 1)
    writeIndex(index)
    res.json({ deleted: id })
  } catch (err) {
    console.error('Data lake delete error:', err)
    res.status(500).json({ error: err.message || 'Failed to delete dataset' })
  }
})

// Helper for other routes: get dataset payload by id (data + columns + types)
function getDatasetById(id) {
  if (!id || typeof id !== 'string') return null
  const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '')
  if (!safeId) return null
  const filePath = path.join(DATA_LAKE_DIR, `${safeId}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

module.exports = router
module.exports.getDatasetById = getDatasetById
