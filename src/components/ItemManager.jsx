import React, { useCallback, useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { uploadImage, replaceImage, deleteImageByUrl } from "../lib/uploadImage";
import { addItem, getItems, updateItem, deleteItem } from "../lib/items";

export default function ItemManager({ businessId }) {
  const [item, setItem] = useState({ name: "", price: "", description: "", requireAddress: false });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(true);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [image]);

  const loadItems = useCallback(async () => {
    if (!businessId) return;
    const data = await getItems(businessId);
    setItems(data);
  }, [businessId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const toggleList = async () => {
    const next = !showList;
    setShowList(next);
    if (next) await loadItems();
  };

  const handleAddOrUpdate = async () => {
    if (!businessId) return alert("No business selected!");
    setLoading(true);
    try {
      if (editingId) {
        const current = items.find((x) => x.id === editingId);
        let nextImageUrl = current?.imageUrl || null;
        // If user chose a new image, replace it
        if (image) {
          nextImageUrl = await replaceImage(image, businessId, current?.imageUrl, 'items');
        } else if (removeImage && current?.imageUrl) {
          // Explicit removal
          await deleteImageByUrl(current.imageUrl);
          nextImageUrl = null;
        }
        const updates = { ...item, requireAddress: !!item.requireAddress };
        if (removeImage && !image) {
          updates.imageUrl = deleteField();
        } else if (image) {
          updates.imageUrl = nextImageUrl;
        }
        await updateItem(businessId, editingId, updates);
        alert("✅ Item updated!");
        setEditingId(null);
      } else {
        const imageUrl = image ? await uploadImage(image, businessId, 'items') : null;
        const data = { ...item, requireAddress: !!item.requireAddress, ...(imageUrl ? { imageUrl } : {}) };
        const id = await addItem(businessId, data);
        alert(`✅ Added new item (ID: ${id})`);
      }
      setItem({ name: "", price: "", description: "", requireAddress: false });
      setImage(null);
      setRemoveImage(false);
      await loadItems();
    } catch (e) {
      console.error(e);
      alert("❌ Error saving item.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (x) => {
    setItem({ name: x.name, price: x.price, description: x.description, requireAddress: !!x.requireAddress });
    setPreview(x.imageUrl || null);
    setImage(null);
    setRemoveImage(false);
    setEditingId(x.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setItem({ name: "", price: "", description: "", requireAddress: false });
    setImage(null);
    setPreview(null);
    setRemoveImage(false);
  };

  const handleDelete = async (id) => {
    const toDelete = items.find((x) => x.id === id);
    if (!window.confirm("Delete this item?")) return;
    try {
      if (toDelete?.imageUrl) await deleteImageByUrl(toDelete.imageUrl);
      await deleteItem(businessId, id);
      await loadItems();
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  };

  return (
    <div className="p-5 border rounded-lg bg-white shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Item Manager</h2>
      </div>

      {/* Items only; no type toggle */}

      <input
        type="text"
        placeholder="Name"
        value={item.name}
        onChange={(e) => setItem({ ...item, name: e.target.value })}
        className="border p-2 w-full mb-2 rounded"
      />
      <input
        type="number"
        placeholder="Price"
        value={item.price}
        onChange={(e) => setItem({ ...item, price: e.target.value })}
        className="border p-2 w-full mb-2 rounded"
      />
      <textarea
        placeholder="Description"
        value={item.description}
        onChange={(e) => setItem({ ...item, description: e.target.value })}
        className="border p-2 w-full mb-2 rounded"
      />

      <label className="flex items-center gap-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={!!item.requireAddress}
          onChange={(e) => setItem({ ...item, requireAddress: e.target.checked })}
        />
        Require shipping address at purchase
      </label>

      {/* Item image chooser */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Item image</label>
        <p className="text-xs text-gray-500 mb-2">Shown on your storefront and item page. Recommended square image (≥ 800×800).</p>
        <div className="border-2 border-dashed rounded p-3 bg-gray-50">
          {preview ? (
            <div className="mb-2">
              <img src={preview} alt="Item image preview" className="w-32 h-32 object-cover rounded border mb-2" />
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">No image yet. Click “Choose image” to upload.</div>
          )}
          <div className="flex items-center gap-3">
            <input id="item-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => { setImage(e.target.files[0]); setRemoveImage(false); }} />
            <label htmlFor="item-image-input" className="px-3 py-2 bg-gray-200 rounded cursor-pointer hover:bg-gray-300">
              Choose image
            </label>
            {(preview || removeImage) && (
              <button
                type="button"
                className="text-sm text-red-600 underline"
                onClick={() => { setImage(null); setPreview(null); setRemoveImage(true); }}
              >
                Remove image
              </button>
            )}
            <span className="text-xs text-gray-500">PNG or JPG, up to 5MB</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={handleAddOrUpdate} disabled={loading} className={`bg-green-600 text-white px-4 py-2 rounded ${loading ? 'opacity-50' : ''}`}>
          {editingId ? "Update Item" : loading ? "Saving..." : "Add Item"}
        </button>
        {editingId && (
          <button onClick={handleCancelEdit} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        )}
        <button onClick={toggleList} className="bg-blue-600 text-white px-4 py-2 rounded">{showList ? 'Hide List' : 'Show List'}</button>
      </div>

      <div style={{ overflow: 'hidden', transition: 'max-height 300ms ease', maxHeight: showList ? '1000px' : '0px' }}>
        <ul className="bg-gray-100 p-4 mt-4">
          {items.map((x) => (
            <li key={x.id} className="border-b py-3 flex items-center justify-between hover:bg-gray-50 transition">
              <div className="flex items-center">
                {x.imageUrl && (
                  <img src={x.imageUrl} alt={x.name} className="w-16 h-16 object-cover rounded mr-4 border" />
                )}
                <div>
                  <strong>{x.name}</strong> — ${x.price}
                  <p className="text-sm text-gray-600">{x.description}</p>
                  {x.requireAddress && <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">Address required</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(x)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                <button onClick={() => handleDelete(x.id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
