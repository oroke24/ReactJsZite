import React, { useState } from "react";
import { addBusiness } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const { user } = useAuth();
  const [business, setBusiness] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in.");
    setLoading(true);
    try {
      const id = await addBusiness(business, user);
      alert("Business created!");
      navigate(`/dashboard`);
    } catch (err) {
      console.error(err);
      alert("Error creating business.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Create Your Business</h2>

        <input
          type="text"
          placeholder="Business Name"
          value={business.name}
          onChange={(e) => setBusiness({ ...business, name: e.target.value })}
          className="border p-2 w-full mb-3 rounded"
          required
        />

        <textarea
          placeholder="Short Description"
          value={business.description}
          onChange={(e) => setBusiness({ ...business, description: e.target.value })}
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
          {loading ? "Saving..." : "Create Business"}
        </button>
      </form>
    </div>
  );
}
