import { useTheme } from '../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex gap-1 shrink-0" role="group" aria-label="Color theme">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`px-2.5 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
          theme === 'light'
            ? 'bg-white text-gray-900 border-gray-300 dark:bg-slate-600 dark:text-white dark:border-slate-500'
            : 'bg-transparent text-gray-500 border-transparent dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`px-2.5 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
          theme === 'dark'
            ? 'bg-slate-700 text-white border-slate-600 dark:bg-slate-600 dark:border-slate-500'
            : 'bg-transparent text-gray-500 border-transparent dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        Dark
      </button>
    </div>
  )
}
