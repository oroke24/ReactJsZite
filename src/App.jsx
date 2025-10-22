import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Storefront from "./pages/Storefront";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="w-full">
      <nav className="p-4 bg-gray-100 flex justify-between">
        <Link className="p-3 bg-gray-200 rounded-2xl space-x-4"
          to="/">
            Home
        </Link>
        <Link className="p-3 bg-gray-200 rounded-2xl space-x-4"
          to="/store">
           My Store 
        </Link>
        <Link className="p-3 bg-gray-200 rounded-2xl space-x-4"
          to="/dashboard">
            Dashboard
        </Link>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/store" element={<Storefront />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
