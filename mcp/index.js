#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const DEFAULT_BASE_URL = 'http://localhost:5000'
const BASE_URL = normalizeBaseUrl(process.env.ANALYTICS_SHORTS_URL || DEFAULT_BASE_URL)
const API_KEY = process.env.ANALYTICS_SHORTS_API_KEY

const tools = [
  {
    name: 'health_check',
    description: 'Check whether the Analytics Shorts backend is running.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_example_dataset',
    description: 'Fetch one of the built-in Analytics Shorts example datasets.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: {
          type: 'string',
          enum: ['sales', 'attendance', 'donations'],
          description: 'The example dataset to fetch.',
        },
      },
      required: ['dataset'],
      additionalProperties: false,
    },
  },
  {
    name: 'upload_and_analyze',
    description: 'Upload a local tabular file to Analytics Shorts and return the parsed analysis payload.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Absolute path, or a path relative to the MCP server working directory, for a CSV, XLSX, JSON, PDF, XPT, or SAS7BDAT file.',
        },
      },
      required: ['file_path'],
      additionalProperties: false,
    },
  },
  {
    name: 'generate_insights',
    description: 'Generate AI insights from rows and columns already available to Claude.',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Array of row objects to analyze.',
          items: { type: 'object', additionalProperties: true },
        },
        columns: {
          type: 'array',
          description: 'Column names present in the data rows.',
          items: { type: 'string' },
        },
        filename: {
          type: 'string',
          description: 'Optional source filename for context.',
        },
      },
      required: ['data', 'columns'],
      additionalProperties: false,
    },
  },
  {
    name: 'run_federal_entry_report',
    description: 'Start a Federal Entry Intelligence report run.',
    inputSchema: {
      type: 'object',
      properties: {
        industryKey: {
          type: 'string',
          description: 'Industry key used by the backend to resolve default NAICS codes when naics is empty.',
        },
        naics: {
          type: 'array',
          description: 'NAICS codes to use for the report. These override defaults when provided.',
          items: { type: 'string' },
        },
        agency: {
          type: 'string',
          description: 'Optional agency filter.',
        },
        fy: {
          type: 'array',
          description: 'Optional federal fiscal years, for example ["2024", "2025"].',
          items: { type: 'string' },
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          description: 'Optional result limit. The backend caps this at 500.',
        },
      },
      required: ['industryKey', 'naics'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_federal_report_summary',
    description: 'Fetch the summary for a Federal Entry Intelligence report run.',
    inputSchema: {
      type: 'object',
      properties: {
        reportRunId: {
          type: 'string',
          description: 'Report run id returned by run_federal_entry_report.',
        },
      },
      required: ['reportRunId'],
      additionalProperties: false,
    },
  },
]

const server = new Server(
  {
    name: 'analytics-shorts-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params

  try {
    switch (name) {
      case 'health_check':
        return toToolResult(await getJson('/api/health'))

      case 'get_example_dataset':
        return toToolResult(await getJson(`/api/example/${encodeURIComponent(args.dataset)}`))

      case 'upload_and_analyze':
        return toToolResult(await uploadAndAnalyze(args.file_path))

      case 'generate_insights':
        return toToolResult(await postJson('/api/insights', {
          data: args.data,
          columns: args.columns,
          filename: args.filename,
        }))

      case 'run_federal_entry_report':
        return toToolResult(await postJson('/api/reports/federal-entry/run', {
          industryKey: args.industryKey,
          naics: args.naics,
          agency: args.agency,
          fy: args.fy,
          limit: args.limit,
        }))

      case 'get_federal_report_summary':
        return toToolResult(await getJson(`/api/reports/federal-entry/${encodeURIComponent(args.reportRunId)}/summary`))

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return toToolResult({
      error: error.message || String(error),
    }, true)
  }
})

function normalizeBaseUrl(url) {
  return String(url).trim().replace(/\/+$/, '')
}

function getHeaders(extra = {}) {
  const headers = { ...extra }
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`
  }
  return headers
}

async function getJson(endpoint) {
  return requestJson(endpoint, { method: 'GET' })
}

async function postJson(endpoint, body) {
  return requestJson(endpoint, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(dropUndefined(body)),
  })
}

async function requestJson(endpoint, options) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: getHeaders(options.headers),
  })
  return parseJsonResponse(response)
}

async function uploadAndAnalyze(filePathInput) {
  if (!filePathInput || typeof filePathInput !== 'string') {
    throw new Error('file_path is required')
  }

  const filePath = path.resolve(filePathInput)
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), path.basename(filePath))

  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: getHeaders(form.getHeaders()),
    body: form,
  })

  return parseJsonResponse(response)
}

async function parseJsonResponse(response) {
  const text = await response.text()
  const payload = text ? parsePossiblyJson(text) : null

  if (!response.ok) {
    throw new Error(JSON.stringify({
      status: response.status,
      statusText: response.statusText,
      body: payload,
    }))
  }

  return payload
}

function parsePossiblyJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function dropUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  )
}

function toToolResult(payload, isError = false) {
  return {
    isError,
    content: [
      {
        type: 'text',
        text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  }
}

const transport = new StdioServerTransport()
await server.connect(transport)
