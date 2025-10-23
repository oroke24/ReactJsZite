import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById, getBusinessIdBySlug } from "../lib/firestore";
import { getItemById } from "../lib/items";
import { addOrder } from "../lib/orders";

export default function ItemDetail() {
  const { businessId: routeBusinessId, itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(routeBusinessId || null);
  const [business, setBusiness] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    quantity: 1,
    notes: "",
    address1: "",
    address2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        let id = routeBusinessId || null;
        if (!id && user) {
          const profile = await getUserProfile(user.uid);
          if (profile?.primaryBusinessId) id = profile.primaryBusinessId;
        }
        // Try resolving route param as slug first if present
        if (routeBusinessId) {
          const bySlug = await getBusinessIdBySlug(routeBusinessId);
          if (bySlug) id = bySlug;
        }
        if (!id) return;
        setBusinessId(id);
        const b = await getBusinessById(id);
        setBusiness(b);
        const it = await getItemById(id, itemId);
        setItem(it);
      } catch (e) {
        console.error("Failed to load item", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [routeBusinessId, user, itemId]);


  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setShowImageModal(false);
    };
    if (showImageModal) {
      window.addEventListener('keydown', onKey);
    }
    return () => window.removeEventListener('keydown', onKey);
  }, [showImageModal]);

  const price = useMemo(() => {
    const p = parseFloat(item?.price || 0);
    const q = parseInt(form.quantity || 1, 10);
    return (isNaN(p) || isNaN(q)) ? 0 : p * q;
  }, [item, form.quantity]);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!businessId || !item) return;
    setSubmitting(true);
    try {
      const shippingAddress = item.requireAddress
        ? {
            address1: form.address1,
            address2: form.address2 || "",
            city: form.city,
            region: form.region,
            postalCode: form.postalCode,
            country: form.country,
          }
        : undefined;

      const order = {
        itemId: item.id,
        itemName: item.name,
        unitPrice: parseFloat(item.price || 0),
        quantity: parseInt(form.quantity || 1, 10),
        total: price,
        buyerName: form.name,
        buyerEmail: form.email,
        notes: form.notes || "",
        ...(shippingAddress ? { shippingAddress } : {}),
        status: "requested",
      };
      const id = await addOrder(businessId, order);
      alert(`Purchase request submitted! Order ID: ${id}`);
      setForm({ name: "", email: "", quantity: 1, notes: "", address1: "", address2: "", city: "", region: "", postalCode: "", country: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading…</div>;
  }
  if (!item) {
    return <div>Item not found.</div>;
  }

  return (
    <React.Fragment>
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            const target = business?.slug
              ? `/store/${business.slug}`
              : (business?.id ? `/store/${business.id}` : (businessId ? `/store/${businessId}` : null));
            if (target) {
              navigate(target);
            } else if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/store');
            }
          }}
          className="text-blue-600 hover:underline"
        >
          ← Back to Store
        </button>
      </div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        {business?.name && (
          <div className="text-sm text-gray-600">from {business.name}</div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          {item.imageUrl && (
            <button
              type="button"
              className="h-64 overflow-auto rounded border w-full text-left cursor-zoom-in"
              onClick={() => setShowImageModal(true)}
              aria-label="Expand image"
            >
              <img src={item.imageUrl} alt={item.name} className="block w-full h-auto" />
            </button>
          )}
          <p className="mt-3 text-gray-800 whitespace-pre-wrap">{item.description}</p>
        </div>

        <div className="p-4 border rounded bg-white shadow">
          <div className="text-xl font-semibold">${item.price}</div>
          <form className="mt-4 space-y-3" onSubmit={submitOrder}>
            <div>
              <label className="block text-sm mb-1">Your name</label>
              <input className="border p-2 rounded w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" className="border p-2 rounded w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Quantity</label>
              <input type="number" min={1} className="border p-2 rounded w-full" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            {item?.requireAddress && (
              <fieldset className="border rounded p-3">
                <legend className="px-1 text-sm text-gray-700">Shipping address</legend>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm mb-1">Address line 1</label>
                    <input className="border p-2 rounded w-full" value={form.address1} onChange={(e) => setForm({ ...form, address1: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Address line 2 (optional)</label>
                    <input className="border p-2 rounded w-full" value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm mb-1">City</label>
                      <input className="border p-2 rounded w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">State/Province</label>
                      <input className="border p-2 rounded w-full" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Postal code</label>
                      <input className="border p-2 rounded w-full" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Country</label>
                    <input className="border p-2 rounded w-full" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
                  </div>
                </div>
              </fieldset>
            )}
            <div>
              <label className="block text-sm mb-1">Notes (optional)</label>
              <textarea className="border p-2 rounded w-full" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Total: <span className="font-semibold">${price.toFixed(2)}</span></div>
              <button type="submit" disabled={submitting} className={`bg-green-600 text-white px-4 py-2 rounded ${submitting ? 'opacity-50' : ''}`}>
                {submitting ? 'Submitting…' : 'Purchase'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    {showImageModal && (
      <div
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={() => setShowImageModal(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-2 border-b">
            <div className="font-semibold text-sm truncate pr-2">{item.name}</div>
            <button type="button" className="px-2 py-1 text-gray-600 hover:text-black" onClick={() => setShowImageModal(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="p-2">
            <img src={item.imageUrl} alt={item.name} className="block max-w-full h-auto mx-auto" />
          </div>
        </div>
      </div>
    )}
    </React.Fragment>
  );
}
