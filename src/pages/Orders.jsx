import React, { useEffect, useState } from "react";
import OrdersManager from "../components/OrdersManager";
import { useAuth } from "../context/AuthContext";
import { getBusinessesByUser, getUserProfile } from "../lib/firestore";

export default function Orders() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.primaryBusinessId) {
          setBusinessId(profile.primaryBusinessId);
        } else {
          const businesses = await getBusinessesByUser(user.uid);
          if (businesses && businesses.length > 0) {
            setBusinessId(businesses[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load business for orders page", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="p-4">Loading orders…</div>;
  }
  if (!businessId) {
    return <div className="p-4">No business found.</div>;
  }

  return (
    <div className="text-gray-900">
      <h1 className="text-2xl mb-4">Orders</h1>
      <OrdersManager businessId={businessId} />
    </div>
  );
}
