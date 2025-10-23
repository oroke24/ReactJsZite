import React, { useState } from "react";
import Modal from "./Modal";
import { addUserRequest } from "../lib/firestore";

export default function ContactAdminModal({ isOpen, onClose, userId, businessId, defaultEmail }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !message.trim()) {
      alert("Please provide your email and a message.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await addUserRequest({ userId, businessId, email, message });
      alert("Message sent to admin. Reference: " + id);
      setMessage("");
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact admin" maxWidth="32rem">
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
        <div className="text-xs text-gray-600 mb-3">
          These fields will be sent to support: userId, businessId, your email, and your message.
        </div>
        <div className="grid gap-3">
          <div>
            <label className="block text-sm mb-1">User ID</label>
            <input className="border p-2 rounded w-full text-xs" value={userId || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Business ID</label>
            <input className="border p-2 rounded w-full text-xs" value={businessId || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm mb-1">Your email</label>
            <input
              type="email"
              className="border p-2 rounded w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Message</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 ${submitting ? "opacity-50" : ""}`}
            >
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
