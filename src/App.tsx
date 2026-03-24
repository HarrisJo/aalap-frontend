import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import HomeFeed from "./pages/HomeFeed.tsx"
import ThreadDetail from "./pages/ThreadDetail.tsx"
import ProfilePage from "./pages/ProfilePage.tsx"
import PublicProfilePage from "./pages/PublicProfilePage.tsx"

// ─── 1. CREATE A REUSABLE TRANSITION WRAPPER ──────────────────────────────────
// This applies a smooth fade and slight vertical glide to any page it wraps.
const PageTransition = ({ children }: { children: React.ReactNode }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // Custom smooth easing
            style={{ width: "100%", height: "100%" }}
        >
            {children}
        </motion.div>
    );
};

// ─── 2. EXTRACT ROUTES TO USE THE LOCATION HOOK ───────────────────────────────
// AnimatePresence needs to know when the route changes, which requires useLocation().
// useLocation must be called inside a component that is a child of BrowserRouter.
function AnimatedRoutes() {
    const location = useLocation();

    return (
        // mode="wait" ensures the old page fully fades out before the new one fades in.
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/"            element={<PageTransition><LandingPage /></PageTransition>} />
                <Route path="/auth"        element={<PageTransition><AuthPage /></PageTransition>} />
                <Route path="/home"        element={<PageTransition><HomeFeed /></PageTransition>} />
                <Route path="/threads/:id" element={<PageTransition><ThreadDetail /></PageTransition>} />
                <Route path="/profile"     element={<PageTransition><ProfilePage /></PageTransition>} />
                <Route path="/users/:id"   element={<PageTransition><PublicProfilePage /></PageTransition>} />
            </Routes>
        </AnimatePresence>
    );
}

// ─── 3. MAIN APP COMPONENT ────────────────────────────────────────────────────
function App() {
    return (
        <BrowserRouter>
            <AnimatedRoutes />
        </BrowserRouter>
    )
}

export default App