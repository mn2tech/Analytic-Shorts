import { Link } from 'react-router-dom'

function FederalEntryBrief() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* HERO SECTION */}
        <section className="text-center">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-4">
            NM2TECH Strategic Intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Federal Entry Intelligence Brief™
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Strategic Market Entry for Firms Pursuing Their First Federal Award
          </p>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Navigate the federal marketplace with confidence. Our data-driven brief delivers a clear market posture assessment, incumbent landscape analysis, and a prioritized capture roadmap—so you can focus resources on opportunities you can win.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/25"
          >
            Request Intelligence Brief
          </Link>
        </section>

        {/* MARKET POSTURE SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Market Posture Assessment
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Each brief includes a quantified view of your target market—grounded in SAM.gov, USAspending, and our Entry Barrier Score™ methodology.
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="text-indigo-500 font-bold">•</span>
              <span><strong>3-Year Market Size</strong> — Obligation trends across fiscal years so you see growth or contraction.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500 font-bold">•</span>
              <span><strong>Growth Trajectory</strong> — YoY percentage change with interpretation for entry timing.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500 font-bold">•</span>
              <span><strong>Award Size Distribution</strong> — Average award size and implications for prime vs. subcontract strategy.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500 font-bold">•</span>
              <span><strong>Incumbent Concentration</strong> — Top recipients' share of spend; signals integrator-dominated vs. fragmented markets.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500 font-bold">•</span>
              <span><strong>Entry Barrier Score™</strong> — 0–100 index combining concentration, award size, growth, and opportunity volume.</span>
            </li>
          </ul>
        </section>

        {/* FIRST-WIN ENGINE SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            First-Win Engine
          </h2>
          <ul className="space-y-4 mb-6">
            <li>
              <span className="font-semibold text-emerald-700">Prime Candidate</span>
              <p className="text-sm text-gray-600 mt-1">Opportunities with strong fit, low barrier, and favorable set-aside or complexity—pursue as prime.</p>
            </li>
            <li>
              <span className="font-semibold text-amber-700">Teaming Candidate</span>
              <p className="text-sm text-gray-600 mt-1">Higher-barrier opportunities where structured teaming or subcontract entry reduces risk and builds past performance.</p>
            </li>
            <li>
              <span className="font-semibold text-red-700">Strategic Avoid</span>
              <p className="text-sm text-gray-600 mt-1">Vehicle-locked, incumbent-dominated, or complexity-mismatched opportunities—don't chase low-probability wins.</p>
            </li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed">
            The First-Win Engine ranks opportunities by fit score and first-win friendliness. You receive a shortlist with Prime/Team/Avoid recommendations, so every bid decision is evidence-based.
          </p>
        </section>

        {/* CAPTURE ROADMAP SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Capture Roadmap
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-bold text-indigo-700 mb-2">0–30 Days</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Agency positioning</li>
                <li>Partner identification</li>
                <li>Qualification tasks</li>
                <li>SBO outreach</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-700 mb-2">30–60 Days</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Proposal readiness</li>
                <li>Capability gap closure</li>
                <li>Compliance preparation</li>
                <li>Teaming agreements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-700 mb-2">60–90 Days</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>First bid execution</li>
                <li>Teaming finalization</li>
                <li>Pricing strategy</li>
                <li>Past performance packaging</li>
              </ul>
            </div>
          </div>
        </section>

        {/* EXECUTIVE SESSION SECTION */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Executive Session
          </h2>
          <p className="text-gray-700 leading-relaxed">
            A 60-minute strategy session with an experienced capture advisor. Walk through your brief, validate Prime vs. Teaming decisions, and align your 90-day roadmap with agency timelines. Bring your NAICS, target agencies, and key questions.
          </p>
        </section>

        {/* INVESTMENT SECTION */}
        <section className="rounded-xl border-2 border-indigo-200 bg-indigo-50 shadow-sm p-6 sm:p-8">
          <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">
            Investment
          </h2>
          <div className="text-center mb-6">
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              $1,497 – One-Time Strategic Engagement
            </p>
            <p className="text-gray-600 mt-2">
              Delivery within 5 business days
            </p>
          </div>
          <p className="text-sm text-gray-600 text-center mb-6">
            Includes the full Federal Entry Intelligence Brief (market posture, incumbent landscape, opportunity shortlist, capture roadmap, structural risk mitigation) plus the 60-minute executive strategy session.
          </p>
          <div className="flex justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Schedule Consultation
            </Link>
          </div>
        </section>

        {/* CTA to Report */}
        <section className="text-center pt-4">
          <p className="text-sm text-gray-500 mb-2">
            Already a subscriber? Run the live report.
          </p>
          <Link
            to="/reports/federal-entry"
            className="text-indigo-600 font-medium hover:underline"
          >
            Federal Entry Report →
          </Link>
        </section>
      </div>
    </div>
  )
}

export default FederalEntryBrief
