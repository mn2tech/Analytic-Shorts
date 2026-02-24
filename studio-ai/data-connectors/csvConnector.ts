import * as XLSX from 'xlsx'
import type { CanonicalDataset } from '../contracts/canonicalDataset'
import { inferSchema, normalizeRows } from './normalizer'

export interface CsvConnectorInput {
  buffer?: ArrayBuffer | Uint8Array | Buffer
  filename?: string
  datasetId?: string
}

function toUint8Array(buf: any): Uint8Array {
  if (buf instanceof Uint8Array) return buf
  // Node Buffer is a Uint8Array subclass, but keep this for safety
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(buf)) return new Uint8Array(buf)
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf)
  throw new Error('csvConnector: buffer must be ArrayBuffer/Uint8Array/Buffer')
}

export async function csvConnector(input: CsvConnectorInput): Promise<CanonicalDataset> {
  if (input?.datasetId) {
    throw new Error('csvConnector: datasetId resolution is server-side in this project (use backend datalake)')
  }
  if (!input?.buffer) throw new Error('csvConnector: buffer is required')

  const filename = String(input.filename || '').trim()
  const bytes = toUint8Array(input.buffer)

  const wb = XLSX.read(bytes, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames?.[0]
  if (!sheetName) {
    return {
      schema: [],
      rows: [],
      metadata: {
        sourceType: 'csv',
        sourceName: filename || 'upload',
        fetchedAt: new Date().toISOString(),
        rowCount: 0,
      },
    }
  }

  const ws = wb.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })
  const rows = normalizeRows(raw)
  const schema = inferSchema(rows)

  return {
    schema,
    rows,
    metadata: {
      sourceType: 'csv',
      sourceName: filename || 'upload',
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }
}

