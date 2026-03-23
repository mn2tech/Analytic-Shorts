import { Link } from 'react-router-dom'

export default function NM2TECHLandingPage() {
  const keywords = [
    'create dashboard from Excel',
    'AI data analysis tool',
    'no code analytics tool',
    'patient flow management software',
    'reduce ER wait time',
    'hospital command center software',
  ]

  const faqs = [
    {
      q: 'What is NM2TECH Analytics Shorts?',
      a: 'NM2TECH Analytics Shorts is an AI data analysis tool that helps teams upload Excel or CSV files, generate dashboards quickly, and turn raw data into business-ready insights.',
    },
    {
      q: 'Can I create a dashboard from Excel without coding?',
      a: 'Yes. Our no code analytics tool is designed to help users create a dashboard from Excel or CSV files in minutes, with AI-assisted charting and summaries.',
    },
    {
      q: 'Is this only for business analytics?',
      a: 'No. NM2TECH also supports healthcare operations use cases such as patient flow management software concepts, real-time hospital dashboards, and hospital command center software workflows.',
    },
    {
      q: 'How does this help hospitals reduce ER wait time?',
      a: 'The platform can be adapted to visualize throughput, bottlenecks, room status, and operational KPIs so leadership teams can identify delays and act faster to reduce ER wait time.',
    },
  ]

  const features = [
    {
      title: 'Create Dashboard from Excel',
      text: 'Upload Excel or CSV files and generate fast, executive-ready dashboards without spending hours building charts manually.',
    },
    {
      title: 'AI Data Analysis Tool',
      text: 'Ask questions in plain English, uncover trends, and generate summaries that help teams move from raw data to action.',
    },
    {
      title: 'No Code Analytics Tool',
      text: 'Give business users a faster way to explore data, build visuals, and share findings without relying on a full BI team for every request.',
    },
    {
      title: 'Healthcare and Patient Flow Use Cases',
      text: 'Support operational dashboards for hospitals, including patient flow management software concepts, hospital command center software views, and throughput monitoring.',
    },
  ]

  const useCases = [
    'Business teams that need dashboards from Excel fast',
    'Consultants creating client-ready analytics in less time',
    'Operations leaders who need real-time KPI visibility',
    'Hospitals exploring patient flow management software and command center analytics',
  ]

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-full border px-3 py-1 text-sm font-medium text-slate-600">
                AI analytics workspace for faster dashboards and operational insights
              </div>
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
                Create a dashboard from Excel in minutes with an AI data analysis tool built for speed.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                NM2TECH Analytics Shorts helps teams upload Excel or CSV data, generate dashboards fast, and uncover insights with a no code analytics tool designed for business and healthcare operations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#demo"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Request a Demo
                </a>
                <a
                  href="#features"
                  className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  See Features
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Instant Analytics Preview</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Demo-ready
                </span>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-medium text-slate-500">Upload</div>
                  <div className="mt-2 text-base font-semibold">Excel / CSV -&gt; parsed automatically</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">AI Insight</div>
                    <div className="mt-2 text-2xl font-bold">+ Fast trends</div>
                    <p className="mt-1 text-sm text-slate-600">Plain-English summaries and chart suggestions.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-500">Dashboard</div>
                    <div className="mt-2 text-2xl font-bold">Real-time view</div>
                    <p className="mt-1 text-sm text-slate-600">Business KPIs, operational metrics, and export-ready visuals.</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-900 p-5 text-white">
                  <div className="text-sm font-medium text-slate-300">Healthcare use case</div>
                  <div className="mt-2 text-xl font-semibold">Hospital command center software workflows</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Visualize throughput, room status, delays, and patient flow signals to help teams spot bottlenecks earlier and reduce ER wait time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Built for teams that need answers, dashboards, and action fast</h2>
          <p className="mt-4 text-lg text-slate-600">
            Whether you need to create a dashboard from Excel, explore trends with an AI data analysis tool, or prototype patient flow management software views, NM2TECH Analytics Shorts helps you move faster.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why teams choose NM2TECH Analytics Shorts</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>
                Traditional reporting is too slow for teams that need decisions now. Analysts spend hours cleaning files, creating visuals, and writing summaries. Leaders wait too long for answers.
              </p>
              <p>
                NM2TECH Analytics Shorts combines AI-assisted analysis, rapid dashboard generation, and operational storytelling in one workflow. That makes it a practical fit for business reporting, consulting engagements, and healthcare operations analytics.
              </p>
              <p>
                For hospital teams, the same foundation can support patient flow management software concepts, hospital command center software views, and throughput dashboards designed to highlight where delays are increasing and where intervention can reduce ER wait time.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Best-fit use cases</h3>
            <ul className="mt-4 space-y-3 text-slate-600">
              {useCases.map((item) => (
                <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Speed</div>
              <div className="mt-2 text-3xl font-bold">Minutes</div>
              <p className="mt-2 text-slate-600">Go from spreadsheet to dashboard faster than traditional reporting workflows.</p>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Clarity</div>
              <div className="mt-2 text-3xl font-bold">AI-assisted</div>
              <p className="mt-2 text-slate-600">Turn raw data into charts, summaries, and decision-ready narratives.</p>
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Flexibility</div>
              <div className="mt-2 text-3xl font-bold">Business + Healthcare</div>
              <p className="mt-2 text-slate-600">Adapt the platform for commercial analytics or operational healthcare dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Need a faster way to create dashboards and operational insights?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            See how NM2TECH Analytics Shorts can help your team create a dashboard from Excel, accelerate reporting, and explore AI-driven analytics workflows.
          </p>
          <div id="demo" className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="mailto:michael@nm2tech.com" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900">
              Email for Demo
            </a>
            <a href="https://www.nm2tech.com" className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white">
              Visit NM2TECH
            </a>
            <Link to="/hospital-demo-request" className="rounded-2xl border border-slate-500 px-5 py-3 text-sm font-semibold text-white">
              Hospital Demo Request Page
            </Link>
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
