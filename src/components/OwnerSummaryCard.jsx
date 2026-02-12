export default function OwnerSummaryCard({ summary, loading }) {
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

