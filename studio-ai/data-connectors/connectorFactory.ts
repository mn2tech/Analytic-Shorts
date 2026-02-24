import type { CanonicalDataset } from '../contracts/canonicalDataset'
import { csvConnector, type CsvConnectorInput } from './csvConnector'
import { apiConnector, type ApiConnectorConfig } from './apiConnector'
import { samGovConnector, type SamGovConnectorConfig } from './samGovConnector'

export type ConnectorFactoryInput =
  | ({ sourceType: 'csv' } & CsvConnectorInput)
  | ({ sourceType: 'api' | 'external' } & ApiConnectorConfig)
  | ({ sourceType: 'samgov' } & SamGovConnectorConfig)
  | ({ sourceType: 'db' } & Record<string, any>) // db is server-side in this project

export async function connectorFactory(input: ConnectorFactoryInput, opts: any = {}): Promise<CanonicalDataset> {
  switch (input.sourceType) {
    case 'csv':
      return csvConnector(input)
    case 'api':
    case 'external':
      return apiConnector(input, opts)
    case 'samgov':
      return samGovConnector(input, opts)
    case 'db':
      throw new Error('connectorFactory(db): DB connector is server-side in this project')
    default:
      throw new Error(`connectorFactory: unsupported sourceType "${(input as any).sourceType}"`)
  }
}

