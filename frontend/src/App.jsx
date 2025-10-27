import { Navigate, Route, Routes } from "react-router";

// Home Page
import HomePageUser from "./pages/HomePageUser.jsx";
import HomePageDoctor from "./pages/HomePageDoctor.jsx";
import HomePageInstitute from "./pages/HomePageInstitute.jsx";
import HomePageAdmin from "./pages/HomePageAdmin.jsx";

import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

// Onboarding
import OnboardingUser from "./pages/OnboardingUser.jsx";
import OnboardingDoctor from "./pages/OnboardingDoctor.jsx";
import OnboardingInstitute from "./pages/OnboardingInstitute.jsx";
import OnboardingAdmin from "./pages/OnboardingAdmin.jsx";

import Pending from "./pages/Pending.jsx";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";
import OtherProfilePage from "./pages/OtherProfilePage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  if (isLoading) return <PageLoader />;

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.status === "onBoarded";
  const isPending = authUser?.status === "pending";
  const userRole = authUser?.role;

  // Helper to get the correct home page based on role
  const getHomePageComponent = () => {
    switch (userRole) {
      case "doctor":
        return <HomePageDoctor />;
      case "institute":
        return <HomePageInstitute />;
      case "admin":
        return <HomePageAdmin />;
      default:
        return <HomePageUser />;
    }
  };

  return (
    <div className="min-h-screen" data-theme={theme}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/signup"
          element={!isAuthenticated ? <SignUpPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />}
        />

        {/* Onboarding Routes */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              isPending ? (
                <Navigate to="/pending" />
              ) : !isOnboarded ? (
                userRole === "doctor" ? (
                  <OnboardingDoctor />
                ) : userRole === "institute" ? (
                  <OnboardingInstitute />
                ) : userRole === "admin" ? (
                  <OnboardingAdmin />
                ) : (
                  <OnboardingUser />
                )
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/pending"
          element={
            isAuthenticated && isPending ? <Pending /> : <Navigate to="/" />
          }
        />

        {/* Protected Routes with Layout */}
        <Route element={<Layout showSidebar={true} />}>
          {/* Home - All roles */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["user", "doctor", "institute", "admin"]}>
                {getHomePageComponent()}
              </ProtectedRoute>
            }
          />

          {/* Profile - All roles */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["user", "doctor", "institute", "admin"]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Other User Profile - All roles */}
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute allowedRoles={["user", "doctor", "institute", "admin"]}>
                <OtherProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Settings - All roles */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["user", "doctor", "institute", "admin"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Search - Only users */}
          <Route
            path="/search"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Notifications - Only users */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Routes without full layout (chat and call pages) */}
        <Route element={<Layout showSidebar={false} />}>
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute allowedRoles={["user", "doctor", "institute"]}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Call page without layout */}
        <Route
          path="/call/:id"
          element={
            <ProtectedRoute allowedRoles={["user", "doctor", "institute"]}>
              <CallPage />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </div>
  );
};

export default App;
