import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById } from "../lib/firestore";
import { getProducts } from "../lib/products";
import { getServices } from "../lib/services";

export default function Storefront() {
  const { businessId: routeBusinessId } = useParams();
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(routeBusinessId || null);
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        let id = routeBusinessId || null;
        if (!id && user) {
          const profile = await getUserProfile(user.uid);
          if (profile?.primaryBusinessId) id = profile.primaryBusinessId;
        }

        if (!id) return;
        setBusinessId(id);
        const b = await getBusinessById(id);
        setBusiness(b);
  const p = await getProducts(id);
  setProducts(p);
  const s = await getServices(id);
  setServices(s);
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

          <section>
            <h2 className="text-2xl font-semibold mb-4">Products</h2>
            {products.length === 0 && <p>No products yet.</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div key={prod.id} className="border rounded p-4 bg-white shadow">
                  {prod.imageUrl && (
                    <img src={prod.imageUrl} alt={prod.name} className="w-full h-40 object-cover mb-3" />
                  )}
                  <h3 className="font-bold">{prod.name}</h3>
                  <div className="text-sm text-gray-600">${prod.price}</div>
                  <p className="text-sm mt-2">{prod.description}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Services</h2>
            {services.length === 0 && <p>No services yet.</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {services.map((svc) => (
                <div key={svc.id} className="border rounded p-4 bg-white shadow">
                  {svc.imageUrl && (
                    <img src={svc.imageUrl} alt={svc.name} className="w-full h-40 object-cover mb-3" />
                  )}
                  <h3 className="font-bold">{svc.name}</h3>
                  <div className="text-sm text-gray-600">${svc.price}</div>
                  <p className="text-sm mt-2">{svc.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}