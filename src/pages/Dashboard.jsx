import { useState, useEffect } from "react";
import ProductManager from "../components/ProductManager";
import ServiceManager from "../components/ServiceManager";
import { useAuth } from "../context/AuthContext";
import { getBusinessesByUser, getUserProfile } from "../lib/firestore";

export default function Dashboard() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(null);
  

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

      <ProductManager businessId={businessId} />
      <ServiceManager businessId={businessId} />
    </div>
  );
}
