import { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById } from "../lib/firestore";
import { updateBusiness } from "../lib/firestore";
import { uploadImage, replaceImage, deleteImageByUrl } from "../lib/uploadImage";

export default function Account() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePos, setImagePos] = useState({ x: 50, y: 50 });

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

  // Maintain image preview for selected file or existing business image
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!removeImage) {
      setImagePreview(business?.imageUrl || null);
    } else {
      setImagePreview(null);
    }
  }, [imageFile, business, removeImage]);

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
                {business.imageUrl && (
                  <div className="mb-3">
                    <img src={business.imageUrl} alt="Business" className="w-full max-w-xl h-40 object-cover rounded border" style={{ objectPosition: business.imagePosition || '50% 50%' }} />
                  </div>
                )}
                <h3 className="text-lg font-bold">{business.name}</h3>
                <p className="text-sm text-gray-700">{business.description}</p>
                <div className="mt-2">
                  <div className="text-sm">Company email: {business.companyEmail || "—"}</div>
                  <div className="text-sm">Company phone: {business.companyPhone || "—"}</div>
                </div>
                {business.backgroundColor && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm">Storefront background:</span>
                    <span className="inline-block w-6 h-6 rounded border" style={{ backgroundColor: business.backgroundColor }} />
                    <span className="text-xs text-gray-600">{business.backgroundColor}</span>
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500">Business ID: {business.id}</div>
                <button
                  onClick={() => {
                    setForm({ name: business.name || "", description: business.description || "", companyEmail: business.companyEmail || "", companyPhone: business.companyPhone || "", backgroundColor: business.backgroundColor || "" });
                    setImageFile(null);
                    setRemoveImage(false);
                    setImagePreview(business.imageUrl || null);
                    // init image position from saved value like "25% 75%"
                    let x = 50, y = 50;
                    if (typeof business.imagePosition === 'string') {
                      const m = business.imagePosition.match(/(\d+)%\s+(\d+)%/);
                      if (m) { x = parseInt(m[1], 10); y = parseInt(m[2], 10); }
                    }
                    setImagePos({ x, y });
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
                    const updates = { name: form.name, description: form.description, companyEmail: form.companyEmail, companyPhone: form.companyPhone };
                    updates.backgroundColor = form.backgroundColor ? form.backgroundColor : deleteField();
                    // Image handling
                    if (removeImage && business.imageUrl) {
                      updates.imageUrl = deleteField();
                      updates.imagePosition = deleteField();
                      await deleteImageByUrl(business.imageUrl);
                    } else if (imageFile) {
                      const url = await replaceImage(imageFile, business.id, business.imageUrl || null, 'business');
                      updates.imageUrl = url;
                      updates.imagePosition = `${imagePos.x}% ${imagePos.y}%`;
                    } else if (business.imageUrl) {
                      // keep or update position if image stays
                      updates.imagePosition = `${imagePos.x}% ${imagePos.y}%`;
                    }
                    await updateBusiness(business.id, updates);
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
                {/* Image upload/preview */}
                <div className="mb-3">
                  {imagePreview && (
                    <div className="mb-2">
                      <img src={imagePreview} alt="Preview" className="w-full max-w-xl h-40 object-cover rounded border" style={{ objectPosition: `${imagePos.x}% ${imagePos.y}%` }} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={(e) => { setImageFile(e.target.files[0]); setRemoveImage(false); }} />
                    {(business?.imageUrl || imagePreview) && (
                      <button
                        type="button"
                        className="text-sm text-red-600 underline"
                        onClick={() => { setImageFile(null); setRemoveImage(true); setImagePreview(null); }}
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  {(business?.imageUrl || imagePreview) && !removeImage && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-700 block mb-1">Horizontal focus: {imagePos.x}%</label>
                        <input type="range" min="0" max="100" value={imagePos.x} onChange={(e) => setImagePos(pos => ({ ...pos, x: parseInt(e.target.value, 10) }))} className="w-full" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700 block mb-1">Vertical focus: {imagePos.y}%</label>
                        <input type="range" min="0" max="100" value={imagePos.y} onChange={(e) => setImagePos(pos => ({ ...pos, y: parseInt(e.target.value, 10) }))} className="w-full" />
                      </div>
                      <div className="md:col-span-2">
                        <button type="button" className="text-sm text-gray-600 underline" onClick={() => setImagePos({ x: 50, y: 50 })}>Reset position</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-gray-700">Storefront background</label>
                  <input
                    type="color"
                    className="w-10 h-10 p-0 border rounded"
                    value={form.backgroundColor || '#ffffff'}
                    onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                  />
                  <button
                    type="button"
                    className="text-sm text-gray-600 underline"
                    onClick={() => setForm({ ...form, backgroundColor: "" })}
                  >
                    Clear
                  </button>
                </div>
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
