export default function OwnerSummaryCard({ summary, loading, dark = false }) {
  if (dark) {
    return (
      <section
        className="rounded-lg p-4"
        style={{ background: '#1e293b', border: '0.5px solid #334155', borderRadius: '12px' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Owner Summary – Today</h3>
        <div className="mt-2 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {loading ? (
            <p style={{ color: '#64748b' }}>Generating summary…</p>
          ) : summary ? (
            <p className="whitespace-pre-wrap">{summary}</p>
          ) : (
            <p style={{ color: '#64748b' }}>Summary unavailable.</p>
          )}
        </div>
      </section>
    )
  }
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-800">Owner Summary – Today</h3>
      <div className="mt-2 text-sm text-gray-600 leading-relaxed">
        {loading ? (
          <p className="text-gray-400">Generating summary…</p>
        ) : summary ? (
          <p className="whitespace-pre-wrap">{summary}</p>
        ) : (
          <p className="text-gray-400">Summary unavailable.</p>
        )}
      </div>
    </section>
  )
}

