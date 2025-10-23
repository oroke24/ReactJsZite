import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById } from "../lib/firestore";
import { updateBusiness } from "../lib/firestore";

export default function Account() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        if (p?.primaryBusinessId) {
          const b = await getBusinessById(p.primaryBusinessId);
          setBusiness(b);
        }
      } catch (err) {
        console.error("Failed to load account data", err);
      }
    };
    load();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Account</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">User</h2>
        <div className="mt-2">
          <div>Email: {user?.email}</div>
          <div>UID: {user?.uid}</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Business</h2>
        {!business && <p className="mt-2">No business found yet. Create one in Business Setup.</p>}
        {business && (
          <div className="mt-2 bg-white p-4 rounded shadow">
                {!editing && (
              <>
                <h3 className="text-lg font-bold">{business.name}</h3>
                <p className="text-sm text-gray-700">{business.description}</p>
                <div className="mt-2">
                  <div className="text-sm">Company email: {business.companyEmail || "—"}</div>
                  <div className="text-sm">Company phone: {business.companyPhone || "—"}</div>
                </div>
                <div className="mt-3 text-xs text-gray-500">Business ID: {business.id}</div>
                <button
                  onClick={() => {
                    setForm({ name: business.name || "", description: business.description || "", companyEmail: business.companyEmail || "", companyPhone: business.companyPhone || "" });
                    setEditing(true);
                  }}
                  className="mt-3 bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Edit Business
                </button>
              </>
            )}

            {editing && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateBusiness(business.id, { name: form.name, description: form.description, companyEmail: form.companyEmail, companyPhone: form.companyPhone });
                    const updated = await getBusinessById(business.id);
                    setBusiness(updated);
                    setEditing(false);
                    alert("Business updated");
                  } catch (err) {
                    console.error(err);
                    alert("Failed to update business");
                  }
                }}
              >
                <input
                  className="border p-2 w-full mb-2 rounded"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="border p-2 w-full mb-2 rounded"
                  placeholder="Company email"
                  value={form.companyEmail}
                  onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                />
                <input
                  className="border p-2 w-full mb-2 rounded"
                  placeholder="Company phone"
                  value={form.companyPhone}
                  onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                />
                <textarea
                  className="border p-2 w-full mb-2 rounded"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="bg-gray-400 text-white px-3 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
