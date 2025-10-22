import React, { useState } from "react";
import { addBusiness, getBusinessesByUser, updateBusiness } from "../lib/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

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
      if (business.id) {
        // update existing business
        const updates = { name: business.name, description: business.description };
        await updateBusiness(business.id, updates);
        alert("Business updated!");
      } else {
        const id = await addBusiness(business, user);
        alert("Business created!");
      }
      navigate(`/dashboard`);
    } catch (err) {
      console.error(err);
      alert("Error creating business.");
    } finally {
      setLoading(false);
    }
  };

  // load existing business for user
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const businesses = await getBusinessesByUser(user.uid);
        if (businesses && businesses.length > 0) {
          // take the first business for now
          const b = businesses[0];
          setBusiness({ id: b.id, name: b.name || "", description: b.description || "" });
        }
      } catch (err) {
        console.error("Failed to load business:", err);
      }
    };
    load();
  }, [user]);

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
