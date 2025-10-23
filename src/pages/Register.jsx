import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser, sendVerificationEmail } from "../lib/auth";
import { ensureBusinessForUser, setUserProfile } from "../lib/firestore";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      // ensure a stable business doc tied to the new user uid
      const defaultBusiness = { name: `${email.split("@")[0]}'s Shop`, description: "Welcome to my store!" };
      const businessId = await ensureBusinessForUser(user, defaultBusiness);
      // persist primary business id on the user profile so other pages can find it
      await setUserProfile(user.uid, { primaryBusinessId: businessId });
      // redirect to verification page
      navigate("/verify-email");
    } catch (err) {
      console.error(err);
      alert("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-80"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

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
          className={`w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition ${
            loading ? "opacity-50" : ""
          }`}
        >
          {loading ? "Creating..." : "Register"}
        </button>

        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
