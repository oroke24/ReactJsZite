import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Storefront from "./pages/Storefront";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Account from "./pages/Account"

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg font-semibold">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* --- Navigation --- */}
      <nav className="p-4 bg-gray-100 flex justify-between items-center shadow-md">
        <div className="w-full flex gap-3 items-center">
          {!user ? (
            <>
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
              <Link to="/register" className="text-blue-600 hover:underline">
                Register
              </Link>
              
            </>
          ) : (
            <div className="w-full flex justify-between items-center">
              <div className="flex">
                <Link to="/account" className="p-3 mx-2 bg-gray-200 rounded-2xl hover:bg-gray-300">
                  Account
                </Link>
                <Link to="/store" className="p-3 mx-2 bg-gray-200 rounded-2xl hover:bg-gray-300">
                  My Store
                </Link>
                <Link to="/dashboard" className="p-3 mx-2 bg-gray-200 rounded-2xl hover:bg-gray-300">
                  Dashboard
                </Link>
              </div>
              <div className="">
                <button
                  onClick={logout}
                  className="px-3 py-1 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- Page Routes --- */}
      <main className="flex-grow p-6">
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

          {/* Protected route */}
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="/store" element={user ? <Storefront /> : <Navigate to="/" replace/>} />
          <Route path="/account" element={user ? <Account/> : <Navigate to="/" replace/>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
