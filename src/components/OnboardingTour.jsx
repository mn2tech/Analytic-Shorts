import { useEffect, useState } from 'react'

// Try to import react-joyride - use dynamic import to handle build issues
let Joyride = null
let joyridePromise = null

// Lazy load react-joyride
const loadJoyride = async () => {
  if (Joyride) return Joyride
  if (joyridePromise) return joyridePromise
  
  joyridePromise = import('react-joyride')
    .then((module) => {
      Joyride = module.default || module
      return Joyride
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('react-joyride not available, onboarding disabled')
      }
      return null
    })
  
  return joyridePromise
}

function OnboardingTour({ run, onComplete, steps }) {
  const [isRunning, setIsRunning] = useState(run)
  const [joyrideLoaded, setJoyrideLoaded] = useState(false)

  useEffect(() => {
    setIsRunning(run)
  }, [run])

  // Load react-joyride on mount
  useEffect(() => {
    loadJoyride().then((loaded) => {
      setJoyrideLoaded(!!loaded)
    })
  }, [])

  const handleJoyrideCallback = (data) => {
    const { status, type } = data

    if (status === 'finished' || status === 'skipped') {
      setIsRunning(false)
      if (onComplete) {
        onComplete()
      }
    }
  }

  // If Joyride is not available or not loaded yet, don't render anything
  if (!joyrideLoaded || !Joyride) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          backgroundColor: '#2563eb',
          fontSize: '14px',
          padding: '10px 20px',
        },
        buttonBack: {
          color: '#6b7280',
          fontSize: '14px',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '14px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip',
      }}
    />
  )
}

export default OnboardingTour

