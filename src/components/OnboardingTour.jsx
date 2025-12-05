import { useEffect, useState } from 'react'

let Joyride = null
try {
  Joyride = require('react-joyride').default
} catch (e) {
  console.warn('react-joyride not available, onboarding disabled')
}

function OnboardingTour({ run, onComplete, steps }) {
  const [isRunning, setIsRunning] = useState(run)

  useEffect(() => {
    setIsRunning(run)
  }, [run])

  const handleJoyrideCallback = (data) => {
    const { status, type } = data

    if (status === 'finished' || status === 'skipped') {
      setIsRunning(false)
      if (onComplete) {
        onComplete()
      }
    }
  }

  // If Joyride is not available, don't render anything
  if (!Joyride) {
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

