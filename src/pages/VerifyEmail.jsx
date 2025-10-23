import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendVerificationEmail } from "../lib/auth";

export default function VerifyEmail() {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
  }

  const handleResend = async () => {
    try {
      setSending(true);
      await sendVerificationEmail();
      alert("Verification email sent. Please check your inbox and spam folder.");
    } catch (e) {
      console.error(e);
      alert("Failed to send verification email.");
    } finally {
      setSending(false);
    }
  };

  // Auto-check verification status periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const u = await refreshUser();
        if (mounted && u?.emailVerified) {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        // ignore transient errors
      }
    };
    // initial check
    check();
    // poll every 5 seconds
    const id = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-[28rem]">
        <h1 className="text-2xl font-bold mb-4 text-center">Verify your email</h1>
        <p className="text-sm text-gray-700 mb-4 text-center">
          We sent a verification link to:
        </p>
        <p className="text-center font-medium mb-6">{user?.email}</p>
        <div className="space-y-3">
          <button
            className={`w-full bg-blue-600 text-white py-2 rounded ${sending ? "opacity-50" : ""}`}
            onClick={handleResend}
            disabled={sending}
          >
            {sending ? "Sending…" : "Resend verification email"}
          </button>
          <div className="text-center text-sm text-gray-600">
            {autoChecking ? "Waiting for verification… we'll redirect as soon as you're verified." : "You can refresh after verifying."}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Tip: If you don't see the email, check your spam folder or whitelist our address.
        </p>
      </div>
    </div>
  );
}
