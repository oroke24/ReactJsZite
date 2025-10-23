import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Modal from "./Modal";
import { loginUser, resetPassword } from "../lib/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Enter your email above first, then click 'Forgot password?'");
      return;
    }
    try {
      setResetting(true);
      await resetPassword(email);
      alert("Password reset email sent. Check your inbox and spam folder.");
    } catch (err) {
      console.error(err);
      alert("Failed to send reset email. Double-check the address.");
    } finally {
      setResetting(false);
    }
  };

  if (user) return null;

  return (
    <Modal title="Login" onClose={() => navigate("/") }>
      <form onSubmit={handleSubmit} className="w-80 mx-auto">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full mb-3 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition ${loading ? "opacity-50" : ""}`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetting}
          className="w-full mt-2 text-sm text-blue-600 underline disabled:opacity-50"
        >
          {resetting ? "Sending reset…" : "Forgot password?"}
        </button>
        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-blue-600 hover:underline"
          >
            Register
          </button>
        </p>
      </form>
    </Modal>
  );
}
