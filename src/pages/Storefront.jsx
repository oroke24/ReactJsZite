import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById } from "../lib/firestore";
import { getCollections, getCollectionMembers } from "../lib/firestore";
import { getItems } from "../lib/items";

export default function Storefront() {
  const { businessId: routeBusinessId } = useParams();
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionMembers, setCollectionMembers] = useState({}); // { [colId]: Set(itemIds) }

  useEffect(() => {
    const load = async () => {
      try {
        let id = routeBusinessId || null;
        if (!id && user) {
          const profile = await getUserProfile(user.uid);
          if (profile?.primaryBusinessId) id = profile.primaryBusinessId;
        }

  if (!id) return;
        const b = await getBusinessById(id);
        setBusiness(b);
        const [its, cols] = await Promise.all([
          getItems(id),
          getCollections(id),
        ]);
        setItems(its);
        setCollections(cols);

        // Load membership for each collection
        const members = {};
        await Promise.all(
          cols.map(async (col) => {
            const ids = await getCollectionMembers(id, col.id, 'items');
            members[col.id] = new Set(ids);
          })
        );
        setCollectionMembers(members);
      } catch (err) {
        console.error("Failed to load storefront", err);
      }
    };
    load();
  }, [routeBusinessId, user]);

  return (
    <div className="p-6">
      {!business && <h1 className="text-2xl">Storefront</h1>}

      {business && (
        <div>
          <header className="mb-6">
            <h1 className="text-3xl font-bold">{business.name}</h1>
            <p className="text-gray-700">{business.description}</p>
          </header>

          {/* Group by Collection: each collection shows its Items */}
          <section>
            {collections.map((col) => {
              const member = collectionMembers[col.id];
              const colItems = member ? items.filter((it) => member.has(it.id)) : [];
              if (colItems.length === 0) return null;
              return (
                <div key={col.id} className="mb-10">
                  <h2 className="text-2xl font-semibold">{col.name}</h2>
                  {col.description && (
                    <p className="text-gray-700 mb-4">{col.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {colItems.map((it) => (
                      <div key={it.id} className="border rounded p-4 bg-white shadow">
                        {it.imageUrl && (
                          <img src={it.imageUrl} alt={it.name} className="w-full h-40 object-cover mb-3" />
                        )}
                        <h3 className="font-bold">{it.name}</h3>
                        <div className="text-sm text-gray-600">${it.price}</div>
                        <p className="text-sm mt-2">{it.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {collections.length === 0 && (
              <div className="text-gray-600">No collections yet.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}