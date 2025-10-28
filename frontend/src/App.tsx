import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import './App.css'

/**
 * Main App Component
 * Handles routing between login and map pages
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
