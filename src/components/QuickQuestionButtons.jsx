const QUICK_QUESTIONS = [
  { label: 'Hospital Summary', question: 'Summarize hospital status right now.' },
  { label: 'ER Status', question: 'How congested is the ER and what is driving it?' },
  { label: 'Boarding Delays', question: 'How many patients are boarding in the ER and what is the average delay?' },
  { label: 'ICU Capacity', question: 'How many ICU beds are available and what is ICU occupancy?' },
  { label: 'Longest LOS', question: 'What department has the longest LOS and which patient is longest currently?' },
  { label: 'Transfers In Progress', question: 'How many transfers are currently in progress and where are the bottlenecks?' },
  { label: 'Operational Impact', question: 'How much operational impact are we seeing today?' },
  { label: 'Compare Normal vs Optimized', question: 'Compare normal mode vs optimized mode operationally.' },
]

export default function QuickQuestionButtons({ onAsk, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_QUESTIONS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onAsk?.(item.question)}
          disabled={disabled}
          className="px-2.5 py-1.5 rounded-lg border border-blue-300/20 bg-slate-800/80 text-[11px] font-semibold text-slate-200 hover:bg-blue-600/20 hover:border-blue-300/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Ask ${item.label}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
