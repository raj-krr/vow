import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import FlowProtectedRoute from "./FlowProtectedRoute";
import RouteWatcher from "./RouteWatcher";

import Home from "./pages/home";
import Login from "./pages/login";
import Signup from "./components/signup";
import ForgotPassword from "./components/forgotpassword";
import VerifyOtp from "./pages/verifyotp";
import ResetPassword from "./pages/resetpassword";
import ResetSuccess from "./pages/resetsuccess";
import Dashboard from "./components/dashboard/dashboard.jsx";
import ProfilePage from "./pages/profile/ProfilePage";
import Map from "./components/map/Map";
import ChatApp from "./components/chat/chat";
import TermsAndConditions from "./components/terms and conditions";

import { useSelector } from "react-redux";
import { isAuthenticated } from "./api/authApi"; 

const App = () => {
  const isLoggedIn = isAuthenticated();

  const { signupPending, forgotRequested: rdxForgot } =
    useSelector((state) => state.user || {});

  const pendingMode = sessionStorage.getItem("pendingMode");
  const isForgot =
    rdxForgot ||
    !!localStorage.getItem("forgotRequested") ||
    pendingMode === "forgot";

  // OTP flow logic
  const verifyCondition =
    !!signupPending || isForgot || !!localStorage.getItem("forgotOtpVerified");
  const verifyRedirectTo = isForgot ? "/forgot-password" : "/signup";

  return (
    <Router>
      <RouteWatcher />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route
          path="/TermsAndConditions"
          element={<TermsAndConditions />}
        />
        <Route
          path="/terms"
          element={<TermsAndConditions />}
        />

        {/* OTP */}
        <Route
          path="/verify-otp"
          element={
            <FlowProtectedRoute
              condition={verifyCondition}
              redirectTo={verifyRedirectTo}
            >
              <VerifyOtp />
            </FlowProtectedRoute>
          }
        />

        {/* Dashboard (Protected) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Reset Password */}
        <Route
          path="/reset-password"
          element={
            <FlowProtectedRoute
              condition={!!localStorage.getItem("forgotOtpVerified")}
              redirectTo="/forgot-password"
            >
              <ResetPassword />
            </FlowProtectedRoute>
          }
        />

        {/* Reset Success */}
        <Route
          path="/reset-success"
          element={
            <FlowProtectedRoute
              condition={!!localStorage.getItem("resetDone")}
              redirectTo="/login"
            >
              <ResetSuccess />
            </FlowProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Map */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <FlowProtectedRoute
                condition={sessionStorage.getItem("allowMap") === "true"}
                redirectTo="/dashboard"
              >
                <Map />
              </FlowProtectedRoute>
            </ProtectedRoute>
          }
        />

        {/* Chat (IMPORTANT FIX 🔥) */}
        <Route
          path="/workspace/:workspaceId/chat"
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;