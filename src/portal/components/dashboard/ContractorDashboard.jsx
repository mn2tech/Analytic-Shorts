import { useCallback, useEffect, useState } from 'react'
import DashboardSidebar from './DashboardSidebar'
import TimesheetPanel from './TimesheetPanel'
import TimeOffPanel from './TimeOffPanel'
import AiAssistantPanel from './AiAssistantPanel'

export default function ContractorDashboard({ supabase, session, onSignOut }) {
  const [activeTab, setActiveTab] = useState('timesheet')
  const [contractorRow, setContractorRow] = useState(null)
  const [contractorLoadError, setContractorLoadError] = useState(null)

  const user = session?.user
  const accessToken = session?.access_token

  const loadContractor = useCallback(async () => {
    if (!supabase || !user?.email) return
    setContractorLoadError(null)
    const email = user.email.trim()
    const { data, error } = await supabase
      .from('contractors')
      .select('name, role, email, contractor_pay_rate')
      .ilike('email', email)
      .maybeSingle()
    if (error) {
      console.error(error)
      setContractorLoadError(error.message)
      setContractorRow(null)
      return
    }
    setContractorRow(data)
  }, [supabase, user?.email])

  useEffect(() => {
    loadContractor()
  }, [loadContractor])

  return (
    <div className="flex min-h-screen flex-col bg-nm2-surface">
      {contractorLoadError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
          Could not load contractors: {contractorLoadError}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <DashboardSidebar user={user} activeTab={activeTab} onSelectTab={setActiveTab} onSignOut={onSignOut} />

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'timesheet' && <TimesheetPanel contractor={contractorRow} user={user} />}
          {activeTab === 'timeoff' && <TimeOffPanel supabase={supabase} userId={user.id} userEmail={user.email} />}
          {activeTab === 'assistant' && user && accessToken && (
            <AiAssistantPanel user={user} contractor={contractorRow} accessToken={accessToken} />
          )}
          {activeTab === 'assistant' && user && !accessToken && (
            <p className="text-sm text-red-600">No access token in session. Sign out and sign in again.</p>
          )}
        </main>
      </div>
    </div>
  )
}

