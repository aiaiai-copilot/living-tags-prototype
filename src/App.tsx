import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Landing } from './pages/Landing'
import Home from './pages/Home'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <Router>
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
