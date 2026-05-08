const TIPS = [
  {
    title: 'Prompt Engineering',
    description: 'Use explicit constraints, output format, and edge-case criteria before asking AI to generate code.',
    icon: 'P',
  },
  {
    title: 'Reading Unfamiliar Code',
    description: 'Start with entry points, data flow, and side effects to build a fast mental model during interviews.',
    icon: 'R',
  },
  {
    title: 'Validating AI Output',
    description: 'Treat AI suggestions as drafts and always check complexity, null safety, and test coverage.',
    icon: 'V',
  },
  {
    title: 'Knowing Fundamentals',
    description: 'Solid data structures and algorithm basics help you critique AI-generated solutions confidently.',
    icon: 'K',
  },
  {
    title: 'Thinking Out Loud',
    description: 'Narrate trade-offs, fallback options, and assumptions while you solve to show interviewer clarity.',
    icon: 'T',
  },
  {
    title: 'Practicing with Gemini',
    description: 'Simulate AI-assisted interview pacing: ask, verify, iterate, and explain final decisions succinctly.',
    icon: 'G',
  },
]

export default function TipsStrategyTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {TIPS.map((tip) => (
        <article
          key={tip.title}
          className="group rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-indigo-900/25"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/40 bg-indigo-500/20 text-sm font-semibold text-indigo-200">
              {tip.icon}
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">{tip.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{tip.description}</p>
            </div>
          </div>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0 opacity-0 transition group-hover:opacity-100" />
        </article>
      ))}
    </div>
  )
}
