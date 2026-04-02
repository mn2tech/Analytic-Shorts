/**
 * Analytics Apps – Landing page with cards for each analytics app.
 */
import { Link } from 'react-router-dom'

const APPS = [
  {
    name: 'GovCon 4-Pack',
    description: 'SAM.gov and USAspending widgets for government contracting insights.',
    path: '/govcon-4pack',
    icon: '🏛️',
  },
  {
    name: 'Hospital Bed Command Center',
    description: 'Monitor and manage hospital bed capacity and utilization.',
    path: '/hospital-bed-command-center',
    icon: '🏥',
  },
  {
    name: 'Data Center Command Center',
    description: 'Synthetic rack floor map with telemetry, alerts, and workload movements.',
    path: '/data-center-command-center',
    icon: '🖥️',
  },
  {
    name: 'Best Western Command Center',
    description: 'Hotel blueprint command center with room-level overlays and live status simulation.',
    path: '/best-western-command-center',
    icon: '🏨',
  },
  {
    name: 'Federal Entry Brief',
    description: 'Federal opportunity briefs and compliance summaries.',
    path: '/federal-entry-brief',
    icon: '📑',
  },
  {
    name: 'Federal Entry Report',
    description: 'Detailed federal entry reports and analytics.',
    path: '/reports/federal-entry',
    icon: '📋',
  },
  {
    name: 'Execution API',
    description: 'Run PROC SUMMARY / PROC FREQ analytics via API.',
    path: '/apps/execution-api',
    icon: '▶️',
  },
  {
    name: 'Scoring (Beta)',
    description: 'Upload model artifacts and score JSON records via API.',
    path: '/apps/scoring',
    icon: '🎯',
  },
  {
    name: 'Migration Validation Studio',
    description: 'Compare SAS outputs with Python/PySpark outputs and generate audit-ready reconciliation reports.',
    path: '/migration-validation-studio',
    icon: '🧪',
  },
  {
    name: 'SAS to PySpark Migration Studio',
    description: 'Convert SAS code into PySpark blocks, review mappings, and send conversion context to validation.',
    path: '/studio/sas-to-pyspark',
    icon: '🔁',
  },
  {
    name: 'ROI Calculator',
    description: 'Estimate migration savings, reduced validation effort, and enterprise risk impact for SAS modernization.',
    path: '/roi-calculator',
    icon: '💹',
  },
]

export default function AnalyticsApps() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Apps</h1>
        <p className="text-gray-600 mb-8">
          Pre-built analytics applications for government, healthcare, and data execution.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APPS.map((app) => (
            <div
              key={app.path}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
            >
              <span className="text-3xl mb-3 block" aria-hidden="true">
                {app.icon}
              </span>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{app.name}</h2>
              <p className="text-gray-600 text-sm flex-1 mb-4">{app.description}</p>
              <Link
                to={app.path}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Open App
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
