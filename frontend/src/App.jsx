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
import Appointment from "../../backend/src/models/Appointment.js";
import { User } from "lucide-react";
import OtherPage from "./pages/OtherProfilePage.jsx";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const isAuthenticated = Boolean(authUser)
  const isOnboarded = authUser?.status === "onBoarded";
  const isPending = authUser?.status === "pending";
  const userRole = authUser?.role;

  if (isLoading) return <PageLoader />;

  const getOnboardingComponent = () => {
    switch (userRole) {
      case "doctor":
        return <OnboardingDoctor />;
      case "institute":
        return <OnboardingInstitute />;
      case "admin":
        return <OnboardingAdmin />;
      case "user":
      default:
        return <OnboardingUser />;
    }
  };

  const getHomePageComponent = () => {
    switch (userRole) {
      case "doctor":
        return <HomePageDoctor />;
      case "institute":
        return <HomePageInstitute />;
      case "admin":
        return <HomePageAdmin />;
      case "user":
      default:
        return <HomePageUser />;
    }
  };

  return <div className="min-h-screen" data-theme={theme}>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              isPending ? (
                <Navigate to="/pending" />
              ) : isOnboarded ? (
                <Layout showSidebar={true}>
                {getHomePageComponent()}
                </Layout>
              ) : (
                <Navigate to="/onboarding" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/pending"
          element={
            isAuthenticated && isPending ? (
              <Pending />
            ) : (
              <Navigate to={isAuthenticated ? "/" : "/login"} />
            )
          }
        />
        <Route 
          path="/signup" 
          element={
            !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
          } 
        />
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
         } 
        />
        <Route
          path="/notifications"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <NotificationsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Layout showSidebar={true}>
                <ProfilePage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/search"
          element={
            isAuthenticated ? (
              <Layout showSidebar={true}>
                <SearchPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
        path="/settings"
          element={
            isAuthenticated ? (
              <Layout showSidebar={true}>
                <SettingsPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route path="/call/:id" element={
          isAuthenticated && isOnboarded ? (
            <CallPage />
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          } />     
        <Route 
          path="/chat/:id" 
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          } />
          <Route 
          path="/profile/:id" 
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <OtherPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          } />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              isPending ? (
                <Navigate to="/pending" />
              ) : !isOnboarded ? (
                getOnboardingComponent()
              ) : (
                <Navigate to="/" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
      </Routes>
      

    < Toaster />
    </div>;
};

export default App