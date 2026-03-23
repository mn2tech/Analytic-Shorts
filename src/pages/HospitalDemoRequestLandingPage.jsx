import { useState } from 'react'
import { submitHospitalDemoRequest } from '../services/hospitalDemoService'

export default function HospitalDemoRequestLandingPage() {
  const publicBase = import.meta.env.BASE_URL || '/'
  const painPoints = [
    'Limited real-time visibility into patient flow',
    'ER bottlenecks and room turnover delays',
    'Slow decision-making during surge conditions',
    'Operational blind spots across beds, rooms, and transfers',
  ]

  const capabilities = [
    {
      title: 'Real-Time Patient Flow View',
      text: 'Visualize room status, patient movement, bottlenecks, and operational pressure in one command center view.',
    },
    {
      title: 'ER Delay & Throughput Insights',
      text: 'Highlight delays, track wait-time pressure, and surface the areas that need intervention first.',
    },
    {
      title: 'Scenario-Based Demonstrations',
      text: 'Show overcrowding, room turnover, and inbound surge scenarios to support leadership discussions and pilot planning.',
    },
    {
      title: 'Pilot-Ready Approach',
      text: 'Position the solution as a hospital-specific pilot focused on measurable operational improvement, not just another dashboard.',
    },
  ]

  const faqs = [
    {
      q: 'What is this demo for?',
      a: 'This demo showcases NM2TECH’s hospital command center concept for patient flow visibility, ER throughput awareness, and operational decision support.',
    },
    {
      q: 'Who is this for?',
      a: 'This is designed for hospital operations leaders, ER leadership, innovation teams, patient flow stakeholders, and healthcare analytics decision-makers.',
    },
    {
      q: 'Is this a full production deployment?',
      a: 'The demo page is intended to start pilot conversations. It shows the concept, workflow, and value proposition before a data-connected deployment or proof of concept.',
    },
    {
      q: 'What problem does this solve?',
      a: 'It helps hospitals improve visibility into patient flow, identify delays faster, and support decisions that can reduce ER wait times and throughput bottlenecks.',
    },
  ]

  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    organization: '',
    role: '',
    demoFocus: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')
    setIsSubmitting(true)

    try {
      await submitHospitalDemoRequest({
        fullName: formData.fullName,
        workEmail: formData.workEmail,
        organization: formData.organization,
        role: formData.role,
        demoFocus: formData.demoFocus,
      })
      setSubmitSuccess('Thanks! Your demo request was submitted. We will contact you soon.')
      setFormData({
        fullName: '',
        workEmail: '',
        organization: '',
        role: '',
        demoFocus: '',
      })
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Failed to submit demo request'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageFallback = (fallbackPath) => (event) => {
    const img = event.currentTarget
    if (img.dataset.fallbackApplied === 'true') return
    img.dataset.fallbackApplied = 'true'
    img.src = `${publicBase}${fallbackPath}`
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-sm font-medium text-sky-700">
                Hospital command center demo request
              </div>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
                Reduce ER wait time with a real-time patient flow command center demo.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                NM2TECH helps hospitals explore a modern command center approach for patient flow visibility, throughput monitoring, and faster operational decisions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#request-demo"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Request Demo
                </a>
                <a
                  href="#capabilities"
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Explore Capabilities
                </a>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {painPoints.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Operational Demo Snapshot</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Pilot-oriented
                </span>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-500">Use case</div>
                  <div className="mt-2 text-base font-semibold">Hospital command center software concept</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Focus</div>
                    <div className="mt-2 text-2xl font-bold">Patient flow</div>
                    <p className="mt-1 text-sm text-slate-600">Visibility across rooms, delays, and movement.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Goal</div>
                    <div className="mt-2 text-2xl font-bold">Reduce delays</div>
                    <p className="mt-1 text-sm text-slate-600">Support faster operational decisions during busy periods.</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <div className="text-sm font-medium text-slate-300">Demo value</div>
                  <div className="mt-2 text-xl font-semibold">A clearer way to see throughput pressure and bottlenecks</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Use a live-style visual layout to show where congestion is building, where turnover is delayed, and where leadership attention can improve flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Before and After</h2>
            <p className="mt-3 text-lg text-slate-600">
              Compare a baseline hospital blueprint with an operational overlay that highlights room status, patient flow pressure, and delay signals.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Before</div>
              <img
                src={`${publicBase}hospital-blueprint.png`}
                alt="Before: static hospital blueprint layout"
                onError={handleImageFallback('hospital-blueprint.png')}
                className="w-full rounded-xl border border-slate-200 object-cover"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">After</div>
              <img
                src={`${publicBase}demo-page-color.png`}
                alt="After: hospital blueprint with operational overlays and room status"
                onError={handleImageFallback('hospital-blueprint.png')}
                className="w-full rounded-xl border border-slate-200 object-cover"
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Built for hospital operations, throughput visibility, and pilot conversations</h2>
          <p className="mt-4 text-lg text-slate-600">
            This page is designed to help hospital leaders quickly understand the use case, see the operational value, and request a focused demo or pilot discussion.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {capabilities.map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Visibility</div>
              <div className="mt-2 text-2xl font-bold">One operational view</div>
              <p className="mt-2 text-slate-600">Bring room status, delays, and movement into a single leadership-friendly picture.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Decision Support</div>
              <div className="mt-2 text-2xl font-bold">Faster action</div>
              <p className="mt-2 text-slate-600">Surface operational pressure points earlier so teams can respond more confidently.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pilot Readiness</div>
              <div className="mt-2 text-2xl font-bold">Demo to pilot</div>
              <p className="mt-2 text-slate-600">Use the demo as a practical entry point for a hospital-specific pilot discussion.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Expected ROI for hospital operations</h2>
            <p className="mt-4 text-lg text-slate-600">
              Hospitals experience significant operational and financial impact due to ER delays, throughput inefficiencies, and lack of real-time visibility.
            </p>

            <div className="mt-6 space-y-4 text-slate-600">
              <div className="rounded-2xl border p-4">
                <strong>Average ER visits/day:</strong> 150-300 patients
              </div>
              <div className="rounded-2xl border p-4">
                <strong>Estimated delay cost per patient:</strong> $50-$150
              </div>
              <div className="rounded-2xl border p-4">
                <strong>Daily inefficiency cost:</strong> $7,500 - $45,000
              </div>
              <div className="rounded-2xl border p-4 bg-slate-900 text-white">
                <strong>Potential annual impact:</strong> $2M - $10M+ opportunity
              </div>
            </div>

            <p className="mt-6 text-slate-600">
              Even a 10-20% improvement in patient flow and wait time can translate into measurable operational savings and better patient outcomes.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Pilot Program Approach (30 Days)</h3>
            <div className="mt-4 space-y-4 text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Week 1:</strong> Discovery + workflow mapping
                <p className="text-sm mt-1">Understand current patient flow, bottlenecks, and reporting gaps.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Week 2:</strong> Dashboard setup + demo scenarios
                <p className="text-sm mt-1">Configure command center view with simulated or sample data.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Week 3:</strong> Validation with stakeholders
                <p className="text-sm mt-1">Review outputs with operations and ER leadership.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Week 4:</strong> ROI review + next steps
                <p className="text-sm mt-1">Assess impact, identify improvements, and define expansion plan.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-900 p-4 text-white">
              <strong>Pilot Goal:</strong>
              <p className="mt-2 text-sm">Demonstrate measurable improvements in visibility, decision-making, and patient flow efficiency.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Critical Impact Scenario</h2>
            <p className="mt-4 text-lg text-slate-600">
              In a typical mid-size hospital ER, delays compound quickly and create measurable financial and operational strain.
            </p>

            <div className="mt-6 space-y-4 text-slate-600">
              <div className="rounded-2xl border p-4">
                <strong>Patients per day:</strong> 200
              </div>
              <div className="rounded-2xl border p-4">
                <strong>Average delay:</strong> 60 minutes
              </div>
              <div className="rounded-2xl border p-4">
                <strong>Estimated cost per delay:</strong> $75
              </div>
              <div className="rounded-2xl border p-4 bg-red-50">
                <strong>Daily impact:</strong> ~$15,000 loss
              </div>
              <div className="rounded-2xl border p-4 bg-slate-900 text-white">
                <strong>Annual impact:</strong> ~$5.4M loss opportunity
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">High Impact Improvement Scenario</h3>
            <div className="mt-4 space-y-4 text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Target improvement:</strong> 15% reduction in delays
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Time saved per patient:</strong> ~9 minutes
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong>Daily savings:</strong> ~$2,250
              </div>
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <strong>Annual savings:</strong> ~$800K+ potential improvement
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-600">
              Even modest improvements in visibility and decision-making can create significant financial and operational gains across ER throughput and patient flow.
            </div>
          </div>
        </div>
      </section>

      <section id="request-demo" className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Request a hospital demo</h2>
              <p className="mt-4 max-w-xl text-lg text-slate-300">
                See how NM2TECH can present a patient flow and hospital command center concept tailored for operations leaders, innovation teams, and pilot conversations.
              </p>
              <p className="mt-3 max-w-xl text-base text-slate-300">
                We tailor your data into your{' '}
                <span className="font-semibold text-sky-300">Building Blueprint</span>
                {' '}so the demo aligns with your real workflows, bottlenecks, and operational priorities.
              </p>
              <div className="mt-8 space-y-3 text-sm text-slate-300">
                <p><span className="font-semibold text-white">Email:</span> michael@nm2tech.com</p>
                <p><span className="font-semibold text-white">Website:</span> www.nm2tech.com</p>
                <p><span className="font-semibold text-white">Use case:</span> ER wait time reduction, throughput visibility, patient flow monitoring</p>
              </div>
            </div>

            <form className="rounded-3xl bg-white p-6 text-slate-900 shadow-sm" onSubmit={handleSubmit}>
              <div className="space-y-4">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {submitSuccess}
                  </div>
                )}
                <div>
                  <label className="mb-2 block text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.fullName}
                    onChange={handleChange('fullName')}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Work Email</label>
                  <input
                    type="email"
                    placeholder="name@hospital.org"
                    value={formData.workEmail}
                    onChange={handleChange('workEmail')}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Organization</label>
                  <input
                    type="text"
                    placeholder="Hospital or health system"
                    value={formData.organization}
                    onChange={handleChange('organization')}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Role</label>
                  <input
                    type="text"
                    placeholder="VP Operations, ER Director, Innovation Lead"
                    value={formData.role}
                    onChange={handleChange('role')}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">What would you like to see in the demo?</label>
                  <textarea
                    placeholder="Patient flow visibility, room turnover delays, overcrowding, command center view, pilot discussion..."
                    rows={4}
                    value={formData.demoFocus}
                    onChange={handleChange('demoFocus')}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Demo Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Frequently asked questions</h2>
        <div className="mt-8 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">{faq.q}</h3>
              <p className="mt-3 leading-7 text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
