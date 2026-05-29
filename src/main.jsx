import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import UserTourPage from './pages/UserTourPage.jsx'
import AdminRoute from './components/admin/AdminRoute.jsx'

// Lazy-load admin pages — they are never needed by regular tour visitors
const LoginPage = lazy(() => import('./pages/admin/LoginPage.jsx'))
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<UserTourPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
