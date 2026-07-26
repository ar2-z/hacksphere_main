import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CompetitionsPage from './pages/CompetitionsPage'
import TeamPage from './pages/TeamPage'
import LeaderboardPage from './pages/LeaderboardPage'
import QuizPage from './pages/QuizPage'
import DebugPage from './pages/DebugPage'
import IdeathonPage from './pages/IdeathonPage'
import CluesPage from './pages/CluesPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCompetitionsPage from './pages/admin/AdminCompetitionsPage'
import AdminQuizPage from './pages/admin/AdminQuizPage'
import AdminDebugPage from './pages/admin/AdminDebugPage'
import AdminIdeathonPage from './pages/admin/AdminIdeathonPage'
import AdminTeamsPage from './pages/admin/AdminTeamsPage'
import AdminViolationsPage from './pages/admin/AdminViolationsPage'
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-black">
        <div className="animate-spin h-8 w-8 border-2 border-cyan/30 border-t-cyan rounded-full" />
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/dashboard" /> : <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute><CompetitionsPage /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/debugging" element={<ProtectedRoute><DebugPage /></ProtectedRoute>} />
          <Route path="/ideathon" element={<ProtectedRoute><IdeathonPage /></ProtectedRoute>} />
          <Route path="/clues" element={<ProtectedRoute><CluesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
          <Route path="/admin/competitions" element={<AdminRoute><AdminCompetitionsPage /></AdminRoute>} />
          <Route path="/admin/quiz" element={<AdminRoute><AdminQuizPage /></AdminRoute>} />
          <Route path="/admin/debugging" element={<AdminRoute><AdminDebugPage /></AdminRoute>} />
          <Route path="/admin/ideathon" element={<AdminRoute><AdminIdeathonPage /></AdminRoute>} />
          <Route path="/admin/teams" element={<AdminRoute><AdminTeamsPage /></AdminRoute>} />
          <Route path="/admin/violations" element={<AdminRoute><AdminViolationsPage /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncementsPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
