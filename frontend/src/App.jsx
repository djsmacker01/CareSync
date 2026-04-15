import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import MARPage from './pages/mar/MARPage'
import StockPage from './pages/stock/StockPage'
import TasksPage from './pages/tasks/TasksPage'
import FirePage from './pages/fire/FirePage'
import VisitorsPage from './pages/visitors/VisitorsPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import ClientProfilePage from './pages/clients/ClientProfilePage'
import StaffPage from './pages/staff/StaffPage'
import ResetPasswordPage from './pages/ResetPasswordPage'


function ProtectedLayout({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"          element={<Login />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Module 1: Digital MAR */}
          <Route path="/mar" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager', 'readonly']}>
              <MARPage />
            </ProtectedLayout>
          } />

          {/* Module 2: Stock Manager */}
          <Route path="/stock" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager']}>
              <StockPage />
            </ProtectedLayout>
          } />

          {/* Module 3: Task Board */}
          <Route path="/tasks" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager']}>
              <TasksPage />
            </ProtectedLayout>
          } />

          {/* Module 4: Fire Safety */}
          <Route path="/fire" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager', 'readonly']}>
              <FirePage />
            </ProtectedLayout>
          } />

          {/* Module 5: Visitor Log */}
          <Route path="/visitors" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager', 'readonly']}>
              <VisitorsPage />
            </ProtectedLayout>
          } />

          {/* Module 6: Manager Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedLayout roles={['manager']}>
              <DashboardPage />
            </ProtectedLayout>
          } />

          {/* Module 7: Service Users */}
          <Route path="/clients" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager']}>
              <ClientsPage />
            </ProtectedLayout>
          } />
          <Route path="/clients/:id" element={
            <ProtectedLayout roles={['staff', 'supervisor', 'manager']}>
              <ClientProfilePage />
            </ProtectedLayout>
          } />

          {/* Module 8: Staff Management */}
          <Route path="/staff" element={
            <ProtectedLayout roles={['manager']}>
              <StaffPage />
            </ProtectedLayout>
          } />

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
