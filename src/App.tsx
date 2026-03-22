import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import HomeFeed from "./pages/HomeFeed.tsx";

function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
            <Route path="/home" element={<HomeFeed />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App