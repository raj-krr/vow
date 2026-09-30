import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import X from "../assets/X.png";
import Eye from "../assets/Eye.png";
import EyeOff from "../assets/blue eye off.png";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setUserProfile,
  clearWorkspaceContext,
  setUserId,
} from "../components/userslice";
import { loginUser } from "../api/authApi";
import { getProfileInfo } from "../api/profileapi";
import arrow from "../assets/arrow.svg";
import Background from "../components/background";
import socket from "../components/chat/socket";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isProfileNeeded } = useSelector((state) => state.user);
  const profile = useSelector((state) => state.user.profile);

  const isLoggedI = localStorage.getItem("isLogged") === "true";
  const valid = localStorage.getItem("valid") !== "true";

  useEffect(() => {
    if (isLoggedI && profile && valid) {
      navigate("/dashboard");
      localStorage.setItem("valid", "false");
    }
  }, [isLoggedI, profile, navigate, valid]);

  // Prefill identifier
  useEffect(() => {
    const savedIdentifier = localStorage.getItem("rememberedIdentifier");
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIdentifierError("");
    setPasswordError("");

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      if (!trimmedIdentifier)
        setIdentifierError("Please enter your username or email.");
      if (!password) setPasswordError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser({
        identifier: trimmedIdentifier,
        password,
      });

      console.log("Login response:", res);

      // ✅ FIXED SUCCESS CHECK
      if (res.success) {
        const { user, accessToken } = res;

        // Store token for Axios Authorization header (critical for cross-origin production)
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
        }

        dispatch(setUserId(user._id));
        if (user?._id) {
          localStorage.setItem("userId", user._id);
        }

        // Fetch profile
        try {
          const profileRes = await getProfileInfo();
          if (profileRes.status === 200 && profileRes.data.success) {
            dispatch(setUserProfile(profileRes.data.data));
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }

        dispatch(clearWorkspaceContext());

        if (rememberMe) {
          localStorage.setItem("rememberedIdentifier", trimmedIdentifier);
        } else {
          localStorage.removeItem("rememberedIdentifier");
        }

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("isLogged", "true");

        // Socket connect
        if (!socket.connected) {
          socket.connect();
          console.log("✅ Socket connected after login");
        }

        if (isProfileNeeded) {
          navigate("/profile");
        } else {
          navigate("/dashboard");
        }

      } else {
        setPasswordError("Invalid password");
      }

    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.msg || "Server error";

      if (status === 404) {
        setIdentifierError("Email or username not found");
      } else if (status === 400) {
        setPasswordError("Invalid password");
      } else {
        setPasswordError(msg);
      }
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  };

  return (
    <>
      <Background />
      <div className="min-h-screen flex items-center justify-center px-4 font-poppins">
        <div className="bg-white w-full max-w-[570px] rounded-2xl shadow-xl p-10 sm:px-20 relative">
          
          {/* Back Button */}
          <button
            className="absolute top-3 left-6 text-gray-900 text-3xl"
            onClick={() => navigate("/")}
          >
            <img src={arrow} alt="Back" className="h-6 sm:h-8" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="h-8" />
          </div>

          <h2 className="text-center text-[28px] font-medium text-gray-900 mb-1">
            Welcome back
          </h2>

          <p className="text-center text-[16px] text-gray-600 mb-8">
            Do not have an account?{" "}
            <Link to="/signup" className="text-purple-700 hover:underline">
              Sign up
            </Link>
          </p>

          <form onSubmit={handleSubmit}>

            {/* Identifier */}
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Username or Email:
              </label>
              <input
                type="text"
                value={identifier}
                maxLength={50}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setIdentifierError("");
                }}
                className={`w-full border rounded-md px-3 py-2 pr-10 text-sm ${
                  identifierError
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              <p className="text-red-600 mt-1 text-sm">
                {identifierError || " "}
              </p>
            </div>

            {/* Password */}
            <div className="mb-3 relative">
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Password:
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                className={`w-full border rounded-md px-3 py-2 pr-10 text-sm ${
                  passwordError
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              <p className="text-red-600 mt-1 text-sm">
                {passwordError || " "}
              </p>
            </div>

            {/* Remember */}
            <div className="flex justify-between mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-700 text-white rounded-md"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>
        </div>
      </div>
    </>
  );
};

export default Login;