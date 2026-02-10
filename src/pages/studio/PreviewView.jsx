/**
 * PreviewView – Full-width preview canvas + StyleDock.
 */

import PreviewPanel from './components/PreviewPanel'
import StyleDock from './components/StyleDock'

export default function PreviewView({
  spec,
  setSpec,
  data,
  uploadedData,
  dataByDatasetId,
  defaultDatasetId,
  onTabDatasetChange,
  availableDatasetIds,
  schema,
  uploadedSchema,
  filterValues,
  setFilterValues,
  loading,
  onLoadSampleData,
  onUploadClick
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ minHeight: 480 }}>
      <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-2 shrink-0">
        <h2 className="font-semibold text-gray-900 text-sm">Preview</h2>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <PreviewPanel
            spec={spec}
            setSpec={setSpec}
            data={data}
            uploadedData={uploadedData}
            dataByDatasetId={dataByDatasetId}
            defaultDatasetId={defaultDatasetId}
            onTabDatasetChange={onTabDatasetChange}
            availableDatasetIds={availableDatasetIds}
            schema={schema}
            uploadedSchema={uploadedSchema}
            filterValues={filterValues}
            setFilterValues={setFilterValues}
            loading={loading}
            title="Preview"
            showTitleBar={false}
            onLoadSampleData={onLoadSampleData}
            onUploadClick={onUploadClick}
          />
        </div>
        <StyleDock spec={spec} onSpecChange={setSpec} />
      </div>
    </div>
  )
}
