import { Routes, Route, Outlet, useLocation, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import ProtectedRoute from './components/ProtectedRoute'
import BrandWatermark from './components/BrandWatermark'
import PortraitFrame from './components/PortraitFrame'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './layouts/AppLayout'
import NM2TECHLandingPage from './pages/NM2TECHLandingPage'
import HospitalDemoRequestLandingPage from './pages/HospitalDemoRequestLandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SharedDashboard from './pages/SharedDashboard'
import MyDashboards from './pages/MyDashboards'
import Pricing from './pages/Pricing'
import Help from './pages/Help'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import AdminAnalytics from './pages/AdminAnalytics'
import StudioDashboard from './pages/studio/StudioDashboard'
import StudioAppView from './pages/studio/StudioAppView'
import AiVisualBuilderStudio from './pages/AiVisualBuilderStudio'
import AAIStudio from './pages/AAIStudio'
import Feed from './pages/Feed'
import Post from './pages/Post'
import Careers from './pages/Careers'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import Messages from './pages/Messages'
import EditPost from './pages/EditPost'
import Publish from './pages/Publish'
import PublishLink from './pages/PublishLink'
import Live from './pages/Live'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import GovCon4Pack from './pages/GovCon4Pack'
import FederalEntryReport from './pages/FederalEntryReport'
import HospitalBedCommandCenter from './pages/HospitalBedCommandCenter'
import EDBedMapPage from './pages/EDBedMapPage'
import PredictiveBedMapPage from './pages/PredictiveBedMapPage'
import ERCommandMapPage from './pages/ERCommandMapPage'
import FloorMapAIPage from './pages/FloorMapAIPage'
import MotelCommandCenter from './pages/MotelCommandCenter'
import BestWesternCommandCenter from './pages/BestWesternCommandCenter'
import MigrationValidationStudio from './pages/MigrationValidationStudio'
import SasToPySparkStudio from './pages/SasToPySparkStudio'
import RoiCalculator from './pages/RoiCalculator'
import FederalEntryBrief from './pages/FederalEntryBrief'
import Contact from './pages/Contact'
import ExecutionApi from './pages/ExecutionApi'
import Scoring from './pages/Scoring'
import AnalyticsApps from './pages/AnalyticsApps'
import KumonLearningCommandCenter from './pages/KumonLearningCommandCenter'
import TrainingModules from './pages/training/TrainingModules'
import TrainingLesson from './pages/training/TrainingLesson'
import AuditQueuePage from './pages/audit/AuditQueuePage'
import AuditCaseDetailPage from './pages/audit/AuditCaseDetailPage'
import ResponsibleAiCopilotBanking from './pages/ResponsibleAiCopilotBanking'
import MentalHealthParityMcoHelpdeskDemo from './pages/MentalHealthParityMcoHelpdeskDemo'
import InnSoftImporter from './pages/InnSoftImporter'
import Downloads from './pages/Downloads'
import MedStarMontgomeryERCommandCenter from './pages/MedStarMontgomeryERCommandCenter'
import Hub from './pages/Hub'
import AnalyticsShortsLanding from './pages/AnalyticsShortsLanding'
import AnalyticsLayout from './layouts/AnalyticsLayout'
import GovConLayout from './layouts/GovConLayout'
import HealthcareLayout from './layouts/HealthcareLayout'
import CommandCenterLayout from './layouts/CommandCenterLayout'
import DataCenterCommandCenter from './pages/DataCenterCommandCenter'
import MarketingLanding from './pages/MarketingLanding'

/** Redirect /studio to /studio/chat, preserving search (e.g. ?open=:id). */
function StudioIndexRedirect() {
  const location = useLocation()
  return <Navigate to={`/studio/chat${location.search || ''}`} replace />
}

/** Redirect /studio/app/:id to /studio/chat?open=:id so AI Visual Builder can load that dashboard. */
function NavigateToStudioWithOpen() {
  const { id } = useParams()
  return <Navigate to={{ pathname: '/studio/chat', search: id ? `?open=${id}` : '' }} replace />
}

function RootEntry() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#94a3b8',
        }}
      >
        Loading...
      </div>
    )
  }
  return user ? <Navigate to="/hub" replace /> : <MarketingLanding />
}

// Track page views for Google Analytics
function PageViewTracker() {
  const location = useLocation()
  const measurementId = 'G-DKP5MKFBM6'

  useEffect(() => {
    // Track page view if Google Analytics is loaded
    if (window.gtag) {
      window.gtag('config', measurementId, {
        page_path: location.pathname + location.search
      })
    }
  }, [location, measurementId])

  return null
}

function App() {
  return (
      <AuthProvider>
        <NotificationProvider>
        <PortraitFrame>
          <PageViewTracker />
          <Routes>
            {/* Routes WITHOUT layout (no sidebar): login, signup, public share, app view. SharedDashboard stays minimal. */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard/shared/:shareId" element={<SharedDashboard />} />
            <Route path="/apps/execution-api" element={<AppLayout />}>
              <Route index element={<ExecutionApi />} />
            </Route>
            <Route path="/apps/scoring" element={<AppLayout />}>
              <Route index element={<Scoring />} />
            </Route>
            <Route path="/apps/:id" element={<StudioAppView />} />
            <Route path="/apps/:id/:pageId" element={<StudioAppView />} />
            <Route path="/ai-visual-builder" element={<Navigate to="/studio" replace />} />
            <Route path="/live/:sessionId" element={<Live />} />

            {/* Product hub & prefixed shells — Hub.jsx links to /hub, /analytics/*, /govcon/*, etc. */}
            <Route
              path="/hub"
              element={
                <ProtectedRoute>
                  <Hub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AnalyticsLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<AnalyticsShortsLanding />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="feed" element={<Feed />} />
              <Route path="studio" element={<Navigate to="/studio/chat" replace />} />
              <Route path="live" element={<Navigate to="/feed" replace />} />
              <Route path="dashboards" element={<MyDashboards />} />
            </Route>
            <Route
              path="/govcon"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <GovConLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/govcon/federal-entry" replace />} />
              <Route path="federal-entry" element={<FederalEntryReport />} />
              <Route path="briefs" element={<FederalEntryBrief />} />
              <Route path="govcon4pack" element={<GovCon4Pack />} />
            </Route>
            <Route
              path="/healthcare"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <HealthcareLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/healthcare/floormap" replace />} />
              <Route path="floormap" element={<FloorMapAIPage />} />
              <Route path="er-map" element={<ERCommandMapPage />} />
              <Route path="bed-tracking" element={<HospitalBedCommandCenter />} />
            </Route>
            <Route
              path="/portals/command-centers"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <CommandCenterLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/portals/command-centers/best-western" replace />} />
              <Route path="best-western" element={<BestWesternCommandCenter />} />
              <Route path="data-center" element={<DataCenterCommandCenter />} />
              <Route path="kumon" element={<KumonLearningCommandCenter />} />
              <Route path="motel" element={<MotelCommandCenter />} />
            </Route>

            {/* Routes WITH layout (sidebar + Navbar + Footer) */}
            <Route element={<ErrorBoundary><AppLayout /></ErrorBoundary>}>
              <Route path="/" element={<RootEntry />} />
              <Route path="/landing" element={<NM2TECHLandingPage />} />
              <Route path="/hospital-demo-request" element={<HospitalDemoRequestLandingPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
              <Route path="/training" element={<TrainingModules />} />
              <Route path="/training/:id" element={<TrainingLesson />} />
              <Route path="/apps" element={<AnalyticsApps />} />
              <Route path="/govcon-4pack" element={<GovCon4Pack />} />
              <Route path="/hospital-bed-command-center" element={<HospitalBedCommandCenter />} />
              <Route path="/kumon-learning-command-center" element={<KumonLearningCommandCenter />} />
              <Route path="/ed-bed-map" element={<EDBedMapPage />} />
              <Route path="/predictive-bed-map" element={<PredictiveBedMapPage />} />
              <Route path="/er-command-map" element={<ERCommandMapPage />} />
              <Route path="/floormap-ai" element={<FloorMapAIPage />} />
              <Route path="/motel-command-center" element={<MotelCommandCenter />} />
              <Route path="/pms/import-innsoft" element={<InnSoftImporter />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/medstar-montgomery-er-command-center" element={<MedStarMontgomeryERCommandCenter />} />
              <Route path="/best-western-command-center" element={<BestWesternCommandCenter />} />
              <Route path="/migration-validation-studio" element={<MigrationValidationStudio />} />
              <Route path="/roi-calculator" element={<RoiCalculator />} />
              <Route path="/responsible-ai-copilot-banking" element={<ResponsibleAiCopilotBanking />} />
              <Route path="/mental-health-parity-mco-helpdesk" element={<MentalHealthParityMcoHelpdeskDemo />} />
              <Route path="/federal-entry-brief" element={<FederalEntryBrief />} />
              <Route path="/reports/federal-entry" element={<FederalEntryReport />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/help" element={<Help />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route path="/feed" element={<Feed />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/post/:id" element={<Post />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditPost />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/publish/link"
                element={
                  <ProtectedRoute>
                    <PublishLink />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/publish/:dashboardId"
                element={
                  <ProtectedRoute>
                    <Publish />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboards"
                element={
                  <ProtectedRoute>
                    <MyDashboards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute>
                    <AuditQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit/case/:caseId"
                element={
                  <ProtectedRoute>
                    <AuditCaseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/studio" element={<Outlet />}>
                <Route index element={<StudioIndexRedirect />} />
                <Route
                  path="app/:id"
                  element={
                    <ProtectedRoute>
                      <NavigateToStudioWithOpen />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="chat"
                  element={
                    <ProtectedRoute>
                      <AAIStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="data"
                  element={
                    <ProtectedRoute>
                      <AAIStudio />
                    </ProtectedRoute>
                  }
                />
                <Route path="build" element={<Navigate to="/studio/preview" replace />} />
                <Route
                  path="preview"
                  element={
                    <ProtectedRoute>
                      <AAIStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="sas-to-pyspark"
                  element={
                    <ProtectedRoute>
                      <SasToPySparkStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="migration-validation"
                  element={<Navigate to="/migration-validation-studio" replace />}
                />
                <Route
                  path="responsible-ai"
                  element={<Navigate to="/responsible-ai-copilot-banking" replace />}
                />
                <Route
                  path=":dashboardId"
                  element={
                    <ProtectedRoute>
                      <StudioDashboard />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>
          </Routes>
          <BrandWatermark />
        </PortraitFrame>
        </NotificationProvider>
      </AuthProvider>
  )
}

export default App
