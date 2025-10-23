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
  // color/opacity on create removed to simplify UI; set these in the details panel after creation
  const [editColor, setEditColor] = useState("");
  const [editOpacity, setEditOpacity] = useState(100); // percent 0-100
  const [editTextColor, setEditTextColor] = useState("");

  const sortedCollections = useMemo(() => {
    return collections
      .slice()
      .sort((a,b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || (a.name||"").localeCompare(b.name||""));
  }, [collections]);
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
  setEditOpacity(typeof sel?.backgroundOpacity === 'number' ? Math.round(sel.backgroundOpacity * 100) : 100);
  setEditTextColor(sel?.textColor || "");
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

  const nextOrder = () => {
    if (!collections.length) return 1;
    const max = Math.max(...collections.map(c => (typeof c.order === 'number' ? c.order : 0)));
    return (isFinite(max) ? max : 0) + 1;
  };

  const create = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
  const payload = { name: newName.trim(), order: nextOrder() };
      const trimmed = newIntro.trim();
  if (trimmed) payload.description = trimmed; // only include when non-empty
      await addCollection(businessId, payload);
      setNewName("");
      setNewIntro("");
      await refreshCollections();
    } catch (e) {
      console.error(e);
      alert('Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const move = async (id, direction) => {
    // direction: -1 up, +1 down
    const list = sortedCollections;
    const idx = list.findIndex(c => c.id === id);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const a = list[idx];
    const b = list[targetIdx];
    const aOrder = typeof a.order === 'number' ? a.order : idx + 1;
    const bOrder = typeof b.order === 'number' ? b.order : targetIdx + 1;
    setLoading(true);
    try {
      await Promise.all([
        updateCollection(businessId, a.id, { order: bOrder }),
        updateCollection(businessId, b.id, { order: aOrder }),
      ]);
      await refreshCollections();
      setSelectedCollectionId(id);
    } catch (e) {
      console.error(e);
      alert('Failed to reorder');
    } finally {
      setLoading(false);
    }
  };

  const saveIntro = async () => {
    if (!selectedCollectionId) return;
    setLoading(true);
    try {
      const updates = { description: editIntro };
      if (editColor) {
        updates.backgroundColor = editColor;
        const alpha = Math.max(0, Math.min(100, Number(editOpacity)));
        updates.backgroundOpacity = alpha / 100;
      } else {
        updates.backgroundColor = deleteField();
        updates.backgroundOpacity = deleteField();
      }
      updates.textColor = editTextColor ? editTextColor : deleteField();
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
          <div>
            <button className={`bg-green-600 text-white px-3 py-2 rounded ${loading ? 'opacity-50' : ''}`} onClick={create} disabled={loading}>Create</button>
          </div>
        </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sidebar: vertical list of collections with reorder */}
        <div className="md:col-span-1 border rounded p-2 max-h-72 overflow-auto">
          {sortedCollections.map((c, i) => (
            <div key={c.id} className={`flex items-center justify-between px-2 py-1 rounded mb-1 ${selectedCollectionId === c.id ? 'bg-blue-50' : ''}`}>
              <button className="text-left flex-1 underline" onClick={() => setSelectedCollectionId(c.id)}>{c.name}</button>
              <div className="flex items-center gap-1">
                <button title="Move up" className="px-2 py-1 text-xs border rounded disabled:opacity-40" onClick={() => move(c.id, -1)} disabled={i === 0 || loading}>↑</button>
                <button title="Move down" className="px-2 py-1 text-xs border rounded disabled:opacity-40" onClick={() => move(c.id, +1)} disabled={i === sortedCollections.length - 1 || loading}>↓</button>
                <button className="px-2 py-1 text-xs text-red-600 border rounded" onClick={() => remove(c.id)} disabled={loading}>Delete</button>
              </div>
            </div>
          ))}
          {sortedCollections.length === 0 && <div className="text-gray-500">No collections yet.</div>}
        </div>

        {/* Details panel */}
        <div className="md:col-span-2">
      {selectedCollection && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Description for "{selectedCollection.name}"</h3>
            <div className="flex flex-col gap-3">
              <textarea className="border p-2 rounded w-full" rows={2} placeholder="Write a short description for this collection" value={editIntro} onChange={(e) => setEditIntro(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Background color</label>
                  <input type="color" className="w-10 h-10 p-0 border rounded" value={editColor || '#ffffff'} onChange={(e) => setEditColor(e.target.value)} />
                  <button type="button" className="text-sm text-gray-600 underline" onClick={() => { setEditColor(""); setEditOpacity(100); }}>Clear</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Opacity</label>
                  <input className="w-40" type="range" min="0" max="100" value={editOpacity} onChange={(e) => setEditOpacity(Number(e.target.value))} />
                  <span className="text-sm text-gray-600 w-10 text-right">{editOpacity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Text color</label>
                  <input type="color" className="w-10 h-10 p-0 border rounded" value={editTextColor || '#000000'} onChange={(e) => setEditTextColor(e.target.value)} />
                  <button type="button" className="text-sm text-gray-600 underline" onClick={() => setEditTextColor("")}>Clear</button>
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

      {/* Removed duplicated edit section below; single details panel above is the source of truth */}
      </div>
    </div>
  );
}
