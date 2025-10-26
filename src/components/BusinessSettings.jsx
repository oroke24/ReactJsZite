import React, { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { getBusinessById, updateBusiness } from "../lib/firestore";
import { replaceImage, deleteImageByUrl } from "../lib/uploadImage";

export default function BusinessSettings({ businessId }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    companyEmail: "",
    companyPhone: "",
    backgroundColor: "",
    backgroundOpacity: 1,
    useGradient: false,
    gradientFrom: "",
    gradientTo: "",
    gradientAngle: 0,
    textColor: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePos, setImagePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const load = async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        const b = await getBusinessById(businessId);
        setBusiness(b);
      } catch (e) {
        console.error("Failed to load business", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [businessId]);

  // Initialize form when business loads
  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name || "",
      description: business.description || "",
      companyEmail: business.companyEmail || "",
      companyPhone: business.companyPhone || "",
      backgroundColor: business.backgroundColor || "",
      backgroundOpacity: typeof business.backgroundOpacity === 'number' ? business.backgroundOpacity : 1,
      useGradient: !!business.backgroundGradientFrom,
      gradientFrom: business.backgroundGradientFrom || "",
      gradientTo: business.backgroundGradientTo || "",
      gradientAngle: typeof business.backgroundGradientAngle === 'number' ? business.backgroundGradientAngle : 0,
      textColor: business.textColor || "",
    });
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview(business.imageUrl || null);
    let x = 50, y = 50;
    if (typeof business.imagePosition === 'string') {
      const m = business.imagePosition.match(/(\d+)%\s+(\d+)%/);
      if (m) { x = parseInt(m[1], 10); y = parseInt(m[2], 10); }
    }
    setImagePos({ x, y });
  }, [business]);

  // Maintain preview
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

  if (loading) return <div className="p-4">Loading business…</div>;
  if (!business) return <div className="p-4">No business found.</div>;

  return (
    <div className="bg-white p-4 rounded shadow">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const updates = { name: form.name, description: form.description, companyEmail: form.companyEmail, companyPhone: form.companyPhone };
            const clamp01 = (v) => Math.max(0, Math.min(1, v));
            if (form.useGradient && (form.gradientFrom || form.gradientTo)) {
              updates.backgroundGradientFrom = form.gradientFrom || form.gradientTo || '#ffffff';
              updates.backgroundGradientTo = form.gradientTo || form.gradientFrom || '#ffffff';
              updates.backgroundGradientAngle = typeof form.gradientAngle === 'number' ? form.gradientAngle : 0;
              updates.backgroundOpacity = typeof form.backgroundOpacity === 'number' ? clamp01(form.backgroundOpacity) : 1;
              updates.backgroundColor = deleteField();
            } else if (form.backgroundColor) {
              updates.backgroundColor = form.backgroundColor;
              updates.backgroundOpacity = typeof form.backgroundOpacity === 'number' ? clamp01(form.backgroundOpacity) : 1;
              updates.backgroundGradientFrom = deleteField();
              updates.backgroundGradientTo = deleteField();
              updates.backgroundGradientAngle = deleteField();
            } else {
              updates.backgroundColor = deleteField();
              updates.backgroundOpacity = deleteField();
              updates.backgroundGradientFrom = deleteField();
              updates.backgroundGradientTo = deleteField();
              updates.backgroundGradientAngle = deleteField();
            }
            updates.textColor = form.textColor ? form.textColor : deleteField();
            if (removeImage && business.imageUrl) {
              updates.imageUrl = deleteField();
              updates.imagePosition = deleteField();
              await deleteImageByUrl(business.imageUrl);
            } else if (imageFile) {
              const url = await replaceImage(imageFile, business.id, business.imageUrl || null, 'business');
              updates.imageUrl = url;
              updates.imagePosition = `${imagePos.x}% ${imagePos.y}%`;
            } else if (business.imageUrl) {
              updates.imagePosition = `${imagePos.x}% ${imagePos.y}%`;
            }
            await updateBusiness(business.id, updates);
            const updated = await getBusinessById(business.id);
            setBusiness(updated);
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
          placeholder="Business name"
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
          placeholder="Description"
        />

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Main storefront image</label>
          <p className="text-xs text-gray-500 mb-2">This image appears at the top of your public store. Recommended size ≥ 1200×400.</p>
          <div className="border-2 border-dashed rounded p-3 bg-gray-50">
            {imagePreview ? (
              <div className="mb-2">
                <img
                  src={imagePreview}
                  alt="Main storefront image preview"
                  className="w-full max-w-xl h-40 object-cover rounded border"
                  style={{ objectPosition: `${imagePos.x}% ${imagePos.y}%` }}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">No image yet. Click “Choose image” to upload.</div>
            )}

            <div className="flex items-center gap-3">
              <input
                id="main-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  setImageFile(f || null);
                  setRemoveImage(false);
                }}
              />
              <label
                htmlFor="main-image-input"
                className="px-3 py-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300"
              >
                Choose image
              </label>
              {(business?.imageUrl || imagePreview) && (
                <button
                  type="button"
                  className="text-sm text-red-600 underline"
                  onClick={() => { setImageFile(null); setRemoveImage(true); setImagePreview(null); }}
                >
                  Remove image
                </button>
              )}
              <span className="text-xs text-gray-500">PNG or JPG, up to 5MB</span>
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
        </div>

        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Storefront background</label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.useGradient} onChange={(e) => setForm({ ...form, useGradient: e.target.checked })} />
              Use gradient
            </label>
            {!form.useGradient && (
              <>
                <input
                  type="color"
                  className="w-10 h-10 p-0 border rounded"
                  value={form.backgroundColor || '#ffffff'}
                  onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                />
                <button
                  type="button"
                  className="text-sm text-gray-600 underline"
                  onClick={() => setForm({ ...form, backgroundColor: "", backgroundOpacity: 1 })}
                >
                  Clear
                </button>
              </>
            )}
          </div>

          {form.useGradient && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">From</label>
                <input type="color" className="w-10 h-10 p-0 border rounded" value={form.gradientFrom || '#ffffff'} onChange={(e) => setForm({ ...form, gradientFrom: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">To</label>
                <input type="color" className="w-10 h-10 p-0 border rounded" value={form.gradientTo || '#ffffff'} onChange={(e) => setForm({ ...form, gradientTo: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Angle</label>
                <input type="range" min="0" max="360" value={form.gradientAngle} onChange={(e) => setForm({ ...form, gradientAngle: Number(e.target.value) })} />
                <span className="text-sm text-gray-600 w-12 text-right">{form.gradientAngle}°</span>
              </div>
              <button type="button" className="text-sm text-gray-600 underline" onClick={() => setForm({ ...form, gradientFrom: '', gradientTo: '', gradientAngle: 0 })}>Clear gradient</button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Opacity</label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((form.backgroundOpacity ?? 1) * 100)}
              onChange={(e) => setForm({ ...form, backgroundOpacity: Number(e.target.value) / 100 })}
            />
            <span className="text-sm text-gray-600 w-10 text-right">{Math.round((form.backgroundOpacity ?? 1) * 100)}%</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-gray-700">Text color</label>
            <input type="color" className="w-10 h-10 p-0 border rounded" value={form.textColor || '#000000'} onChange={(e) => setForm({ ...form, textColor: e.target.value })} />
            <button type="button" className="text-sm text-gray-600 underline" onClick={() => setForm({ ...form, textColor: '' })}>Clear</button>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              // reset form to current business
              setForm({
                name: business.name || "",
                description: business.description || "",
                companyEmail: business.companyEmail || "",
                companyPhone: business.companyPhone || "",
                backgroundColor: business.backgroundColor || "",
                backgroundOpacity: typeof business.backgroundOpacity === 'number' ? business.backgroundOpacity : 1,
                useGradient: !!business.backgroundGradientFrom,
                gradientFrom: business.backgroundGradientFrom || "",
                gradientTo: business.backgroundGradientTo || "",
                gradientAngle: typeof business.backgroundGradientAngle === 'number' ? business.backgroundGradientAngle : 0,
                textColor: business.textColor || "",
              });
              setImageFile(null);
              setRemoveImage(false);
              setImagePreview(business.imageUrl || null);
              let x = 50, y = 50;
              if (typeof business.imagePosition === 'string') {
                const m = business.imagePosition.match(/(\d+)%\s+(\d+)%/);
                if (m) { x = parseInt(m[1], 10); y = parseInt(m[2], 10); }
              }
              setImagePos({ x, y });
            }}
            className="bg-gray-400 text-white px-3 py-1 rounded"
          >
            Reset
          </button>
          {(business?.imageUrl || imagePreview) && (
            <button
              type="button"
              className="ml-auto text-sm text-red-600 underline"
              onClick={() => { setImageFile(null); setRemoveImage(true); setImagePreview(null); }}
            >
              Remove image
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
