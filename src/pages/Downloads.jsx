export default function Downloads() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Migration Tools</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Free tools to move your existing hotel data into our system
          </p>
        </header>

        <section className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 shadow-xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Innsoft Check-Inn Importer</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Import your existing hotel data from Innsoft Check-Inn into our system in minutes.
                Works with your daily backup ZIP file.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              Free Tool
            </span>
          </div>

          <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200">
            <span className="font-semibold text-slate-100">Supported formats:</span>{' '}
            .ZIP backup files, TODAY.DTA
          </div>

          <a
            href="/innsoft_migrator.py"
            download="innsoft_migrator.py"
            className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
          >
            Download Migration Tool
          </a>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-700/80 bg-slate-800/40 p-6">
          <h3 className="text-lg font-semibold text-slate-100">Instructions</h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-200">
            <li>
              <span className="font-semibold text-slate-100">Step 1:</span> Export your backup from Innsoft:
              {' '}Backup → Create Backup → Save ZIP
            </li>
            <li>
              <span className="font-semibold text-slate-100">Step 2:</span> Run the tool:
              {' '}<code className="rounded bg-slate-900 px-2 py-1 text-emerald-300">python innsoft_migrator.py --zip yourfile.ZIP</code>
            </li>
            <li>
              <span className="font-semibold text-slate-100">Step 3:</span> Your data is ready to import into
              {' '}your new PMS system
            </li>
          </ol>
        </section>

        <p className="mt-8 rounded-xl border border-cyan-300/20 bg-cyan-900/20 px-4 py-3 text-sm text-cyan-100">
          Need help migrating? Contact us and we will do it for you for free.
        </p>
      </div>
    </div>
  )
}
