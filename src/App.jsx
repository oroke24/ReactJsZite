import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Storefront from "./pages/Storefront";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div>
      <nav className="p-4 bg-gray-800 text-white flex justify-between">
        <Link to="/">Home</Link>
        <div className="space-x-4">
          <Link to="/store">Storefront</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
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
