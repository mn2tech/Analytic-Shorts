/**
 * Scenario Control Panel - Controls for demo scenario playback
 * Play, Pause, Reset, Next Step, and scenario selection
 */
import { useState } from 'react'
import { demoScenarios } from '../data/demoScenarios'

export default function ScenarioControlPanel({
  currentScenarioId,
  isPlaying,
  isPaused,
  currentStep,
  totalSteps,
  onScenarioSelect,
  onPlay,
  onPause,
  onReset,
  onNextStep,
  onPreviousStep,
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-slate-800/95 border border-slate-700/50 rounded-lg shadow-lg">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Demo Scenarios
          </span>
          {currentScenarioId && (
            <span className="text-xs text-slate-400">
              Step {currentStep} / {totalSteps}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-slate-700/50">
          {/* Scenario Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Scenario
            </label>
            <select
              value={currentScenarioId || 'normal'}
              onChange={(e) => onScenarioSelect(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal Operations</option>
              {demoScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>

          {/* Control Buttons */}
          {currentScenarioId && (
            <div className="flex gap-2">
              {!isPlaying ? (
                <button
                  onClick={onPlay}
                  className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                >
                  ▶ Play
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors"
                >
                  ⏸ Pause
                </button>
              )}
              <button
                onClick={onReset}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors"
                title="Reset to beginning"
              >
                ↺ Reset
              </button>
              <button
                onClick={onPreviousStep}
                disabled={currentStep <= 1}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                title="Previous step"
              >
                ⏮ Back
              </button>
              <button
                onClick={onNextStep}
                disabled={currentStep >= totalSteps}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                title="Next step"
              >
                ⏭ Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
