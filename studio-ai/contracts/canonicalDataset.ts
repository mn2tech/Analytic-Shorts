export interface CanonicalDataset {
  schema: ColumnDefinition[]
  rows: Record<string, any>[]
  metadata: {
    sourceType: 'csv' | 'api' | 'db' | 'samgov' | 'external'
    sourceName: string
    fetchedAt: string
    rowCount: number
  }
}

export interface ColumnDefinition {
  name: string
  inferredType: 'number' | 'string' | 'date' | 'boolean' | 'object'
  nullable: boolean
  sampleValues: any[]
}

