import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import Home from './pages/Home'
import { Landing } from './pages/Landing'

function App() {
  return (
    <Router basename="/portfolio/living-tags/living-tags-prototype">
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
