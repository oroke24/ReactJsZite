import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import { registerUser, sendVerificationEmail } from "../lib/auth";
import { addBusiness, setUserProfile } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";

export default function RegisterModal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await registerUser(email, password);
      // send verification email immediately to avoid timing issues
      try {
        await sendVerificationEmail(user);
      } catch (e) {
        console.warn("Failed to send verification email immediately after registration", e);
      }
      const defaultBusiness = {
        name: `${email.split("@")[0]}'s Shop`,
        description: "Welcome to my store!",
      };
      const businessId = await addBusiness(defaultBusiness, user);
      await setUserProfile(user.uid, { primaryBusinessId: businessId });
      navigate("/verify-email");
    } catch (err) {
      console.error(err);
      alert("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <Modal title="Register" onClose={() => navigate("/") }>
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
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full mb-4 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition ${loading ? "opacity-50" : ""}`}
        >
          {loading ? "Creating..." : "Register"}
        </button>
        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline"
          >
            Login
          </button>
        </p>
      </form>
    </Modal>
  );
}
