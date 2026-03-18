import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import EmailVerification from "./pages/auth/EmailVerification.tsx";
import Login from "./pages/auth/Login.tsx";
import Index from "./pages/Index.tsx";
import FeedPage from "./pages/feed/page.tsx";
import CalendarPage from "./pages/calendar/page.tsx";
import OrganizationPage from "./pages/organization/page.tsx";
import AdminPage from "./pages/admin/page.tsx";
import ProfilePage from "./pages/profile/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import MobileNav from "./components/MobileNav.tsx";
import AmbientBackground from "./components/AmbientBackground.tsx";

function AppRoutes() {
  const location = useLocation();
  const hideMobileNav =
    location.pathname === "/" || location.pathname.startsWith("/auth");

  return (
    <div className="relative isolate">
      <AmbientBackground />
      <div className={hideMobileNav ? "relative z-20" : "relative z-20 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Index />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/organizations/:slug" element={<OrganizationPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/verify-email" element={<EmailVerification />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        {!hideMobileNav && <MobileNav />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DefaultProviders>
  );
}

