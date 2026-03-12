/**
 * Scenario Engine - Manages demo scenario playback
 * Handles loading, playing, pausing, resetting scenarios
 */

/**
 * Scenario Engine State
 */
export class ScenarioEngine {
  constructor() {
    this.currentScenario = null
    this.currentStep = 0
    this.isPlaying = false
    this.isPaused = false
    this.startTime = null
    this.pauseTime = null
    this.accumulatedPauseTime = 0
    this.stepStartTime = null
    this.timeoutId = null
    this.onStepChange = null
    this.onScenarioEnd = null
    this.baselineState = null
  }

  /**
   * Load a scenario
   */
  loadScenario(scenario, baselineState) {
    this.currentScenario = scenario
    this.currentStep = 0
    this.isPlaying = false
    this.isPaused = false
    this.startTime = null
    this.pauseTime = null
    this.accumulatedPauseTime = 0
    this.stepStartTime = null
    this.baselineState = baselineState
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    
    return this.getCurrentStepData()
  }

  /**
   * Start playing the scenario
   */
  playScenario() {
    if (!this.currentScenario) return
    
    if (this.isPaused) {
      // Resume from pause
      const pauseDuration = Date.now() - this.pauseTime
      this.accumulatedPauseTime += pauseDuration
      this.isPaused = false
      this.pauseTime = null
      this.isPlaying = true
      
      // Continue with current step
      this.scheduleNextStep()
    } else {
      // Start from beginning or current step
      if (!this.startTime) {
        // First time playing - reset to step 0
        this.currentStep = 0
        this.startTime = Date.now()
        this.accumulatedPauseTime = 0
      }
      this.isPlaying = true
      // Always apply current step when starting play (ensures UI updates)
      this.applyCurrentStep()
      // Then schedule the next step
      this.scheduleNextStep()
    }
  }

  /**
   * Pause scenario playback
   */
  pauseScenario() {
    if (!this.isPlaying || this.isPaused) return
    
    this.isPaused = true
    this.pauseTime = Date.now()
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Reset scenario to beginning
   */
  resetScenario() {
    this.currentStep = 0
    this.isPlaying = false
    this.isPaused = false
    this.startTime = null
    this.pauseTime = null
    this.accumulatedPauseTime = 0
    this.stepStartTime = null
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    
    return this.getCurrentStepData()
  }

  /**
   * Move to next step manually
   */
  nextScenarioStep() {
    if (!this.currentScenario) return null
    
    if (this.isPlaying) {
      this.pauseScenario()
    }
    
    if (this.currentStep < this.currentScenario.totalSteps - 1) {
      this.currentStep++
      this.applyCurrentStep()
      return this.getCurrentStepData()
    }
    
    return null
  }

  /**
   * Move to previous step manually
   */
  previousScenarioStep() {
    if (!this.currentScenario) return null
    
    if (this.isPlaying) {
      this.pauseScenario()
    }
    
    if (this.currentStep > 0) {
      this.currentStep--
      this.applyCurrentStep()
      return this.getCurrentStepData()
    }
    
    return null
  }

  /**
   * Get current step data
   */
  getCurrentStepData() {
    if (!this.currentScenario || this.currentStep >= this.currentScenario.steps.length) {
      return null
    }
    
    const step = this.currentScenario.steps[this.currentStep]
    return {
      scenario: this.currentScenario,
      step: step.step,
      totalSteps: this.currentScenario.totalSteps,
      narrative: step.narrative,
      updates: step.updates || {},
    }
  }

  /**
   * Apply current step updates
   */
  applyCurrentStep() {
    const stepData = this.getCurrentStepData()
    if (stepData && this.onStepChange) {
      this.onStepChange(stepData)
    } else {
      console.warn('applyCurrentStep: missing stepData or callback', {
        hasStepData: !!stepData,
        hasCallback: !!this.onStepChange,
        currentStep: this.currentStep,
        totalSteps: this.currentScenario?.steps?.length,
      })
    }
  }

  /**
   * Schedule next step automatically
   */
  scheduleNextStep() {
    if (!this.currentScenario || this.isPaused || !this.isPlaying) return
    
    const currentStepData = this.currentScenario.steps[this.currentStep]
    const nextStepIndex = this.currentStep + 1
    
    if (nextStepIndex >= this.currentScenario.steps.length) {
      // Scenario complete
      this.isPlaying = false
      if (this.onScenarioEnd) {
        this.onScenarioEnd()
      }
      return
    }
    
    const nextStep = this.currentScenario.steps[nextStepIndex]
    const delay = Math.max(100, (nextStep.at - currentStepData.at) * 1000) // Convert to milliseconds, minimum 100ms
    
    this.timeoutId = setTimeout(() => {
      if (!this.isPaused && this.isPlaying) {
        this.currentStep = nextStepIndex
        this.applyCurrentStep()
        this.scheduleNextStep()
      }
    }, delay)
  }

  /**
   * Get elapsed time in scenario (accounting for pauses)
   */
  getElapsedTime() {
    if (!this.startTime) return 0
    
    const now = Date.now()
    const baseElapsed = now - this.startTime
    const pauseElapsed = this.isPaused ? (now - this.pauseTime) : 0
    
    return (baseElapsed - this.accumulatedPauseTime - pauseElapsed) / 1000 // Return in seconds
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    this.currentScenario = null
    this.onStepChange = null
    this.onScenarioEnd = null
  }
}

/**
 * Create a new scenario engine instance
 */
export function createScenarioEngine() {
  return new ScenarioEngine()
}

/**
 * Merge scenario updates with baseline state
 */
export function applyScenarioUpdates(baselineState, updates) {
  const merged = {
    rooms: { ...baselineState.rooms },
    waitingRoom: { ...baselineState.waitingRoom },
    inboundArrivals: { ...baselineState.inboundArrivals },
    alerts: [...(baselineState.alerts || [])],
    departmentPressure: { ...baselineState.departmentPressure },
  }
  
  // Apply room updates
  if (updates.rooms) {
    Object.entries(updates.rooms).forEach(([roomId, roomData]) => {
      merged.rooms[roomId] = {
        ...(merged.rooms[roomId] || {}),
        ...roomData,
      }
    })
  }
  
  // Apply waiting room updates
  if (updates.waitingRoom) {
    merged.waitingRoom = { ...merged.waitingRoom, ...updates.waitingRoom }
  }
  
  // Apply inbound arrivals updates
  if (updates.inboundArrivals) {
    merged.inboundArrivals = { ...merged.inboundArrivals, ...updates.inboundArrivals }
  }
  
  // Replace alerts (scenarios control alert state)
  if (updates.alerts !== undefined) {
    merged.alerts = Array.isArray(updates.alerts) ? [...updates.alerts] : []
  }
  
  // Apply department pressure updates
  if (updates.departmentPressure) {
    merged.departmentPressure = {
      ...merged.departmentPressure,
      [updates.departmentPressure.unit]: updates.departmentPressure,
    }
  }
  
  // Add focus room and highlighted zone
  if (updates.focusRoom) {
    merged.focusRoom = updates.focusRoom
  }
  
  if (updates.highlightedZone) {
    merged.highlightedZone = updates.highlightedZone
  }
  
  return merged
}
