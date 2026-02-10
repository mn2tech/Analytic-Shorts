/**
 * StudioWorkspace – Shared Studio layout shell.
 * Renders header toolbar + status chips and a content area (children).
 * State and content are provided by the parent (AiVisualBuilderStudio);
 * this component is presentational only.
 */

export default function StudioWorkspace({ header, children, fullScreen, className = '' }) {
  const wrapperClass = fullScreen
    ? 'fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden'
    : 'min-h-screen bg-gray-50'

  const contentClass = fullScreen
    ? 'flex-1 flex flex-col overflow-hidden'
    : `max-w-[1920px] mx-auto px-4 py-6 ${className || ''}`.trim()

  return (
    <div className={wrapperClass}>
      {header}
      <div className={contentClass}>
        {children}
      </div>
    </div>
  )
}
