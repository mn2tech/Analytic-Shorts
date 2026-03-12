/**
 * Scenario Narrative Panel - Shows current scenario step information
 * Displays scenario name, current step, and narrative text
 */
export default function ScenarioNarrativePanel({
  scenarioName,
  currentStep,
  totalSteps,
  narrative,
  isVisible = true,
}) {
  if (!isVisible || !scenarioName) return null

  return (
    <div className="bg-slate-800/95 border border-slate-700/50 rounded-lg shadow-lg px-4 py-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Scenario: {scenarioName}</h3>
          <span className="text-xs text-slate-400">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        {narrative && (
          <p className="text-xs text-slate-300 leading-relaxed">{narrative}</p>
        )}
      </div>
    </div>
  )
}
