/**
 * TabHeader – Main-area tabs: Report Chat | Preview | Clear.
 * ChatGPT-style: fast, clean. Preview disabled when no spec (tooltip).
 */

export default function TabHeader({ activeTab, setActiveTab, hasSpec }) {
  const previewDisabled = !hasSpec

  return (
    <div className="border-b border-gray-200 flex gap-6 shrink-0 mb-3">
      <button
        type="button"
        onClick={() => setActiveTab('chat')}
        className={`px-0 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          activeTab === 'chat'
            ? 'border-gray-900 text-gray-900 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Report Chat
      </button>
      <button
        type="button"
        onClick={() => !previewDisabled && setActiveTab('preview')}
        disabled={previewDisabled}
        title={previewDisabled ? 'Generate a report first' : 'Preview report'}
        className={`px-0 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          activeTab === 'preview'
            ? 'border-gray-900 text-gray-900 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        } ${previewDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        Preview
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('clear')}
        className={`px-0 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
          activeTab === 'clear'
            ? 'border-gray-900 text-gray-900 font-semibold'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Clear
      </button>
    </div>
  )
}
