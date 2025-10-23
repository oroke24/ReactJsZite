import React, { useEffect, useMemo, useState } from "react";
import { deleteField } from "firebase/firestore";
import { addCollection, deleteCollection, getCollections, getCollectionMembers, addCollectionMember, removeCollectionMember, updateCollection } from "../lib/firestore";
import { getItems } from "../lib/items";

export default function CollectionsManager({ businessId }) {
  const [collections, setCollections] = useState([]);
  const [newName, setNewName] = useState("");
  const [newIntro, setNewIntro] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [items, setItems] = useState([]);
  const [memberItems, setMemberItems] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [editIntro, setEditIntro] = useState("");
  const [newColor, setNewColor] = useState("");
  const [editColor, setEditColor] = useState("");

  const selectedCollection = useMemo(() => collections.find(c => c.id === selectedCollectionId) || null, [collections, selectedCollectionId]);

  useEffect(() => {
    const loadBase = async () => {
      if (!businessId) return;
      const [cols, its] = await Promise.all([
        getCollections(businessId),
        getItems(businessId),
      ]);
      setCollections(cols);
      setItems(its);
      if (cols[0]) setSelectedCollectionId(cols[0].id);
    };
    loadBase();
  }, [businessId]);

  useEffect(() => {
    const loadMembership = async () => {
      if (!businessId || !selectedCollectionId) {
        setMemberItems(new Set());
        setEditIntro("");
        return;
      }
      const ids = await getCollectionMembers(businessId, selectedCollectionId, 'items');
      setMemberItems(new Set(ids));
  const sel = collections.find(c => c.id === selectedCollectionId);
  setEditIntro(sel?.description || "");
  setEditColor(sel?.backgroundColor || "");
    };
    loadMembership();
  }, [businessId, selectedCollectionId, collections]);

  const refreshCollections = async () => {
    const cols = await getCollections(businessId);
    setCollections(cols);
    if (!cols.find(c => c.id === selectedCollectionId)) {
      setSelectedCollectionId(cols[0]?.id || "");
    }
  };

  const create = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
  const payload = { name: newName.trim() };
      const trimmed = newIntro.trim();
  if (trimmed) payload.description = trimmed; // only include when non-empty
  if (newColor && newColor !== '#ffffff') payload.backgroundColor = newColor;
      await addCollection(businessId, payload);
      setNewName("");
      setNewIntro("");
  setNewColor("");
      await refreshCollections();
    } catch (e) {
      console.error(e);
      alert('Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const saveIntro = async () => {
    if (!selectedCollectionId) return;
    setLoading(true);
    try {
      const updates = { description: editIntro };
      updates.backgroundColor = editColor ? editColor : deleteField();
      await updateCollection(businessId, selectedCollectionId, updates);
      await refreshCollections();
    } catch (e) {
      console.error(e);
      alert('Failed to save intro');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this collection?')) return;
    setLoading(true);
    try {
      await deleteCollection(businessId, id);
      await refreshCollections();
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (id) => {
    try {
      const has = memberItems.has(id);
      if (has) {
        await removeCollectionMember(businessId, selectedCollectionId, 'items', id);
        const next = new Set(memberItems); next.delete(id); setMemberItems(next);
      } else {
        await addCollectionMember(businessId, selectedCollectionId, 'items', id);
        const next = new Set(memberItems); next.add(id); setMemberItems(next);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update item membership');
    }
  };

  return (
    <div>
      <div className="p-5 border rounded-lg bg-white shadow">
        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border p-2 rounded w-full" placeholder="New collection name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <textarea className="border p-2 rounded w-full md:col-span-2" rows={1} placeholder="New collection description (optional)" value={newIntro} onChange={(e) => setNewIntro(e.target.value)} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Background color</label>
            <input type="color" className="w-10 h-10 p-0 border rounded" value={newColor || '#ffffff'} onChange={(e) => setNewColor(e.target.value)} />
          </div>
          <div>
            <button className={`bg-green-600 text-white px-3 py-2 rounded ${loading ? 'opacity-50' : ''}`} onClick={create} disabled={loading}>Create</button>
          </div>
        </div>

      <div className="mt-4 flex gap-3 flex-wrap">
        {collections.map(c => (
          <div key={c.id} className={`px-3 py-1 rounded border ${selectedCollectionId === c.id ? 'bg-blue-50 border-blue-400' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <button className="underline" onClick={() => setSelectedCollectionId(c.id)}>{c.name}</button>
              <button className="text-red-600" onClick={() => remove(c.id)}>Delete</button>
            </div>
          </div>
        ))}
        {collections.length === 0 && <div className="text-gray-500">No collections yet.</div>}
      </div>

      {selectedCollection && (
        <div className="mt-6 grid grid-cols-1 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Description for "{selectedCollection.name}"</h3>
            <div className="flex flex-col gap-3">
              <textarea className="border p-2 rounded w-full" rows={2} placeholder="Write a short description for this collection" value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Background color</label>
                  <input type="color" className="w-10 h-10 p-0 border rounded" value={editColor || '#ffffff'} onChange={(e) => setEditColor(e.target.value)} />
                  <button type="button" className="text-sm text-gray-600 underline" onClick={() => setEditColor("")}>Clear</button>
                </div>
                <button className={`bg-blue-600 text-white px-3 py-2 rounded ${loading ? 'opacity-50' : ''}`} onClick={saveIntro} disabled={loading}>Save</button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Items in "{selectedCollection.name}"</h3>
            <div className="max-h-60 overflow-auto border rounded p-2">
              {items
                .slice()
                .sort((a,b) => a.name.localeCompare(b.name))
                .map(it => (
                  <label key={it.id} className="block">
                    <input
                      type="checkbox"
                      checked={memberItems.has(it.id)}
                      onChange={() => toggleItem(it.id)}
                    /> {it.name}
                  </label>
                ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
