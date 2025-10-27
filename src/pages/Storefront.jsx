import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById, getBusinessIdBySlug } from "../lib/firestore";
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
        // If a route param is provided, try to resolve it as a slug first
        if (routeBusinessId) {
          const bySlug = await getBusinessIdBySlug(routeBusinessId);
          if (bySlug) id = bySlug;
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

  const toRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== 'string') return null;
    const h = hex.replace('#','');
    if (h.length !== 6) return null;
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const pageStyle = (() => {
    if (!business) return { backgroundColor: 'transparent' };
    const alpha = typeof business.backgroundOpacity === 'number' ? business.backgroundOpacity : 1;
    if (business.backgroundGradientFrom || business.backgroundGradientTo) {
      const from = business.backgroundGradientFrom || '#ffffff';
      const to = business.backgroundGradientTo || from;
      const angle = typeof business.backgroundGradientAngle === 'number' ? business.backgroundGradientAngle : 0;
      const fromRgba = toRgba(from, alpha) || from;
      const toRgbaStr = toRgba(to, alpha) || to;
      return {
        backgroundImage: `linear-gradient(${angle}deg, ${fromRgba}, ${toRgbaStr})`,
      };
    }
    if (business.backgroundColor) {
      return { backgroundColor: (typeof alpha === 'number' ? (toRgba(business.backgroundColor, alpha) || business.backgroundColor) : business.backgroundColor) };
    }
    return { backgroundColor: 'transparent' };
  })();

  return (
  <div className="min-h-screen" style={pageStyle}>
      {!business && <h1 className="text-2xl p-6">Storefront</h1>}

      {business && (
        <div>
          {/* Hero image at very top, full-width, taller height */}
          {business.imageUrl && (
            <div className="w-full">
              <img
                src={business.imageUrl}
                alt={business.name}
                className="block w-full h-80 md:h-[28rem] object-cover"
                style={{ objectPosition: business.imagePosition || '50% 50%' }}
              />
            </div>
          )}

          <header className="px-6 pt-6 mb-6 text-center">
            <h1 className="text-3xl font-bold mb-3" style={{ color: business?.textColor || undefined }}>{business.name}</h1>
            <p className="max-w-3xl mx-auto" style={{ color: business?.textColor || undefined }}>{business.description}</p>
          </header>

          {/* Group by Collection: each collection shows its Items */}
          <section className="px-6">
            {collections
              .slice()
              .sort((a,b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || (a.name||"").localeCompare(b.name||""))
              .map((col) => {
              const member = collectionMembers[col.id];
              const colItems = member ? items.filter((it) => member.has(it.id)) : [];
              const hasDescription = !!(col.description && String(col.description).trim().length > 0);
              if (colItems.length === 0 && !hasDescription) return null;
              // reuse toRgba defined above
              const bgStyle = col.backgroundColor
                ? { backgroundColor: (typeof col.backgroundOpacity === 'number' ? toRgba(col.backgroundColor, col.backgroundOpacity) : col.backgroundColor) }
                : { backgroundColor: 'transparent' };
              const textStyle = col.textColor ? { color: col.textColor } : undefined;
              const alignStyle = col.textAlign ? { textAlign: col.textAlign } : {};
              return (
                <div key={col.id} className="mb-10 rounded" style={bgStyle}>
                  <div className="p-4">
                  <h2 className="text-2xl font-semibold" style={{ ...(textStyle || {}), ...alignStyle }}>{col.name}</h2>
                  {col.description && (
                    <p className="mb-4" style={{ ...(textStyle || {}), ...alignStyle }}>{col.description}</p>
                  )}
                  {colItems.length > 0 && (
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 pb-2 snap-x snap-mandatory">
                        {colItems.map((it) => (
                          <Link
                            key={it.id}
                            to={business?.id ? `/store/${business.slug || business.id}/item/${it.id}` : `/store/item/${it.id}`}
                            className="flex-none w-64 sm:w-72 border rounded p-4 bg-white text-gray-900 shadow hover:shadow-md transition block snap-start"
                          >
                            {it.imageUrl && (
                              <img src={it.imageUrl} alt={it.name} className="w-full h-36 md:h-40 object-cover mb-3 rounded" />
                            )}
                            <h3 className="font-semibold text-base">{it.name}</h3>
                            <div className="text-sm text-gray-700 font-medium mt-0.5">${it.price}</div>
                            <p className="text-sm mt-2 line-clamp-3 text-gray-700">{it.description}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}

            {collections.length === 0 && (
              <div className="text-gray-600">No collections yet.</div>
            )}
          </section>
          {(business?.companyEmail || business?.companyPhone) && (
            <footer className="mt-12 pt-6 border-t px-6">
              <div className="text-center space-y-3" style={{ color: business?.textColor || undefined }}>
                <div className="text-lg font-semibold">Contact us</div>
                <div className="flex items-center justify-center gap-6 flex-wrap">
                  {business.companyEmail && (
                    <a href={`mailto:${business.companyEmail}`} className="underline hover:opacity-80">
                      {business.companyEmail}
                    </a>
                  )}
                  {business.companyPhone && (
                    <a href={`tel:${business.companyPhone}`} className="underline hover:opacity-80">
                      {business.companyPhone}
                    </a>
                  )}
                </div>
              </div>
            </footer>
          )}
        </div>
      )}
    </div>
  );
}