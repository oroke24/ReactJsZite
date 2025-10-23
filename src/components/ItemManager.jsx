import React, { useCallback, useEffect, useState } from "react";
import { uploadImage, replaceImage, deleteImageByUrl } from "../lib/uploadImage";
import { addItem, getItems, updateItem, deleteItem } from "../lib/items";

export default function ItemManager({ businessId }) {
  const [item, setItem] = useState({ name: "", price: "", description: "" });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(true);

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
      let imageUrl = null;
      if (editingId) {
        const current = items.find((x) => x.id === editingId);
        imageUrl = await replaceImage(image, businessId, current?.imageUrl, 'items');
        await updateItem(businessId, editingId, { ...item, ...(imageUrl && { imageUrl }) });
        alert("✅ Item updated!");
        setEditingId(null);
      } else {
        imageUrl = image ? await uploadImage(image, businessId, 'items') : null;
        const id = await addItem(businessId, { ...item, imageUrl });
        alert(`✅ Added new item (ID: ${id})`);
      }
      setItem({ name: "", price: "", description: "" });
      setImage(null);
      await loadItems();
    } catch (e) {
      console.error(e);
      alert("❌ Error saving item.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (x) => {
    setItem({ name: x.name, price: x.price, description: x.description });
    setPreview(x.imageUrl || null);
    setImage(null);
    setEditingId(x.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setItem({ name: "", price: "", description: "" });
    setImage(null);
    setPreview(null);
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

      <div className="mb-4">
        {preview && (
          <div className="mb-2">
            <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded border mb-2" />
            <button onClick={() => { setImage(null); setPreview(null); }} className="bg-red-500 text-white px-3 py-1 rounded">Remove Image</button>
          </div>
        )}
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} className="block" />
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
