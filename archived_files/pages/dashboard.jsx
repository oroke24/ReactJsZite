import React, { useState } from "react";
import { addBusiness, getAllBusinesses } from "../lib/firestore";

export default function Dashboard() {
  const [businesses, setBusinesses] = useState([]);

  const handleAddBusiness = async () => {
    const id = await addBusiness({
      name: "Test Business",
      ownerEmail: "test@zite.com",
    });
    alert(`Business added with ID: ${id}`);
  };

  const handleGetBusinesses = async () => {
    const data = await getAllBusinesses();
    setBusinesses(data);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Business Dashboard</h1>
      <button onClick={handleAddBusiness} className="bg-green-600 px-4 py-2 rounded mr-3">
        Add Test Business
      </button>
      <button onClick={handleGetBusinesses} className="bg-blue-600 px-4 py-2 rounded">
        Load All Businesses
      </button>

      <ul className="mt-5">
        {businesses.map(b => (
          <li key={b.id} className="border-b py-2">
            {b.name} — {b.ownerEmail}
          </li>
        ))}
      </ul>
    </div>
  );
}
