import { useState, useEffect } from "react";
import ItemManager from "../components/ItemManager";
import CollectionsManager from "../components/CollectionsManager";
import OrdersManager from "../components/OrdersManager";
import { useAuth } from "../context/AuthContext";
import { getBusinessesByUser, getUserProfile } from "../lib/firestore";

export default function Dashboard() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(null);
  const [showCollectionsManager, setShowCollectionsManager] = useState(false);
  const [showItemManager, setShowItemManager] = useState(false);
  const [showOrdersManager, setShowOrdersManager] = useState(false);


  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // First check if the user has a primaryBusinessId saved on their profile
        const profile = await getUserProfile(user.uid);
        if (profile?.primaryBusinessId) {
          setBusinessId(profile.primaryBusinessId);
          return;
        }

        // Fallback: query businesses owned by the user and use the first one
        const businesses = await getBusinessesByUser(user.uid);
        if (businesses && businesses.length > 0) {
          setBusinessId(businesses[0].id);
        }
      } catch (err) {
        console.error('Failed to load businesses for dashboard', err);
      }
    };
    load();
  }, [user]);

  

  return (
    <div>
      <h1 className="text-2xl mb-4">Dashboard</h1>
      {/* Dropdown: Collections Manager */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer" onClick={() => setShowCollectionsManager(v => !v)}>
          <h2 className="text-lg font-semibold">Collections Manager</h2>
          <span className="text-blue-600">{showCollectionsManager ? 'Hide' : 'Show'}</span>
        </div>
        {showCollectionsManager && (
          <div className="mt-2">
            <CollectionsManager businessId={businessId} />
          </div>
        )}
      </div>

      {/* Dropdown: Item Manager */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer" onClick={() => setShowItemManager(v => !v)}>
          <h2 className="text-lg font-semibold">Items Manager</h2>
          <span className="text-blue-600">{showItemManager ? 'Hide' : 'Show'}</span>
        </div>
        {showItemManager && (
          <div className="mt-2">
            <ItemManager businessId={businessId} />
          </div>
        )}
      </div>

      {/* Dropdown: Orders */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer" onClick={() => setShowOrdersManager(v => !v)}>
          <h2 className="text-lg font-semibold">Orders</h2>
          <span className="text-blue-600">{showOrdersManager ? 'Hide' : 'Show'}</span>
        </div>
        {showOrdersManager && (
          <div className="mt-2">
            <OrdersManager businessId={businessId} />
          </div>
        )}
      </div>
    </div>
  );
}
