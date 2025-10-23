import React, { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrder, deleteOrder } from "../lib/orders";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function OrdersManager({ businessId }) {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getOrders(businessId, statusFilter || undefined);
      setOrders(list);
    } catch (e) {
      console.error(e);
      alert("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, statusFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) =>
      [o.itemName, o.buyerName, o.buyerEmail, String(o.total)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [orders, search]);

  const changeStatus = async (id, next) => {
    try {
      await updateOrder(businessId, id, { status: next });
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to update order");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await deleteOrder(businessId, id);
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to delete order");
    }
  };

  const openModal = (order) => {
    setActiveOrder(order);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setActiveOrder(null);
  };

  const fmtDate = (d) => {
    try {
      if (!d) return "—";
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleString();
    } catch {
      return String(d);
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <select
          className="border p-2 rounded"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          className="border p-2 rounded flex-1 min-w-[200px]"
          placeholder="Search by item, buyer, email, total"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`px-3 py-2 rounded bg-blue-600 text-white ${loading ? 'opacity-50' : ''}`}
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="text-gray-600">No orders found.</div>
      )}

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Created</th>
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3">Buyer</th>
              <th className="py-2 pr-3">Qty</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b align-top hover:bg-gray-50 cursor-pointer" onClick={() => openModal(o)}>
                <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                <td className="py-2 pr-3">
                  <div className="font-medium">{o.itemName}</div>
                  {o.notes && <div className="text-gray-600 max-w-[45ch] whitespace-pre-wrap">{o.notes}</div>}
                </td>
                <td className="py-2 pr-3">
                  <div>{o.buyerName}</div>
                  <div className="text-gray-600">{o.buyerEmail}</div>
                </td>
                <td className="py-2 pr-3">{o.quantity}</td>
                <td className="py-2 pr-3">${Number(o.total || 0).toFixed(2)}</td>
                <td className="py-2 pr-3">
                  <select
                    className="border p-1 rounded"
                    value={o.status || 'requested'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); changeStatus(o.id, e.target.value); }}
                  >
                    {STATUS_OPTIONS.filter(s => s.value !== "").map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <button className="text-red-600 underline" onClick={(e) => { e.stopPropagation(); remove(o.id); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && activeOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded shadow-lg max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-semibold">Order details</div>
              <button className="px-2 py-1" onClick={closeModal} aria-label="Close">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-600">Order ID:</span> {activeOrder.id}</div>
                <div><span className="text-gray-600">Created:</span> {fmtDate(activeOrder.createdAt)}</div>
                <div><span className="text-gray-600">Status:</span> {activeOrder.status || 'requested'}</div>
                <div><span className="text-gray-600">Total:</span> ${Number(activeOrder.total || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Item</div>
                <div>{activeOrder.itemName} × {activeOrder.quantity} @ ${Number(activeOrder.unitPrice || 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Buyer</div>
                <div>{activeOrder.buyerName}</div>
                <div className="text-gray-600">{activeOrder.buyerEmail}</div>
              </div>
              {activeOrder.shippingAddress && (
                <div>
                  <div className="font-medium">Shipping address</div>
                  <div>{activeOrder.shippingAddress.address1}</div>
                  {activeOrder.shippingAddress.address2 && <div>{activeOrder.shippingAddress.address2}</div>}
                  <div>{activeOrder.shippingAddress.city}, {activeOrder.shippingAddress.region} {activeOrder.shippingAddress.postalCode}</div>
                  <div>{activeOrder.shippingAddress.country}</div>
                </div>
              )}
              {activeOrder.notes && (
                <div>
                  <div className="font-medium">Notes</div>
                  <div className="whitespace-pre-wrap">{activeOrder.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
