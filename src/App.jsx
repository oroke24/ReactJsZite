import React from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Storefront from "./pages/Storefront";
import ItemDetail from "./pages/ItemDetail";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Account from "./pages/Account"
import VerifyEmail from "./pages/VerifyEmail";
import LoginModal from "./components/LoginModal";
import RegisterModal from "./components/RegisterModal";

export default function App() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  // Hide global navigation on public storefront routes like /store/:slug or /store/:id (but not /store owner view)
  const isPublicStoreRoute = /^\/store\/[A-Za-z0-9-]+(\/.+)?$/.test(location.pathname);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg font-semibold">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* --- Navigation (hidden on public storefront) --- */}
      {!isPublicStoreRoute && (
      <nav className="p-4 bg-gray-100 flex justify-between items-center shadow-md">
        <div className="w-full flex gap-3 items-center justify-end">
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
      )}

      {/* --- Page Routes --- */}
      <main className={isPublicStoreRoute ? "flex-grow" : "flex-grow p-6"}>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<Home />} />
          {/* Show Home in the background with auth modals overlaid */}
          <Route
            path="/login"
            element={
              !user ? (
                <>
                  <Home />
                  <LoginModal />
                </>
              ) : (
                <Navigate to={user?.emailVerified ? "/account" : "/verify-email"} replace />
              )
            }
          />
          <Route
            path="/register"
            element={
              !user ? (
                <>
                  <Home />
                  <RegisterModal />
                </>
              ) : (
                <Navigate to={user?.emailVerified ? "/account" : "/verify-email"} replace />
              )
            }
          />
          <Route path="/verify-email" element={user && !user.emailVerified ? <VerifyEmail /> : <Navigate to={user ? "/account" : "/login"} replace />} />

          {/* Protected route */}
          <Route path="/dashboard" element={user ? (user.emailVerified ? <Dashboard /> : <Navigate to="/verify-email" replace />) : <Navigate to="/" replace />} />
          <Route path="/store" element={user ? (user.emailVerified ? <Storefront /> : <Navigate to="/verify-email" replace />) : <Navigate to="/" replace/>} />
          {/* Public storefront by business id for customers */}
          <Route path="/store/:businessId" element={<Storefront />} />
          <Route path="/store/item/:itemId" element={user ? <ItemDetail /> : <Navigate to="/" replace/>} />
          {/* Public item detail for customers using slug or id in the URL */}
          <Route path="/store/:businessId/item/:itemId" element={<ItemDetail />} />
          <Route path="/account" element={user ? (user.emailVerified ? <Account/> : <Navigate to="/verify-email" replace />) : <Navigate to="/" replace/>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
