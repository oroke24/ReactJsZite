import { useEffect, useState } from "react";
import { deleteField } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, getBusinessById } from "../lib/firestore";
import { checkSlugAvailable, setBusinessSlug, clearBusinessSlug, normalizeSlug } from "../lib/firestore";
import { updateBusiness } from "../lib/firestore";
import { replaceImage, deleteImageByUrl } from "../lib/uploadImage";
import QRCode from "qrcode";
import ContactAdminModal from "../components/ContactAdminModal";
import { createStripeAccount, createStripeAccountLink, syncStripeAccount } from "../lib/stripeApi";

export default function Account() {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePos, setImagePos] = useState({ x: 50, y: 50 });
  const [showUserSection, setShowUserSection] = useState(false);
  const [showBusinessSection, setShowBusinessSection] = useState(false);
  const [showLandingSection, setShowLandingSection] = useState(false);
  const [showPaymentsSection, setShowPaymentsSection] = useState(false);

  const [form, setForm] = useState({ name: "", description: "", backgroundColor: "", backgroundOpacity: 1, useGradient: false, gradientFrom: "", gradientTo: "", gradientAngle: 0 });
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [slugStatus, setSlugStatus] = useState({ state: "idle" }); // idle|checking|available|taken|invalid|reserved|error
  const [qrPreview, setQrPreview] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ stripeAccountId: "", chargesEnabled: false, onboardingComplete: false, payoutsEnabled: false });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        if (p?.primaryBusinessId) {
          const b = await getBusinessById(p.primaryBusinessId);
          setBusiness(b);
          setSlugInput(b?.slug || "");
          setSlugStatus({ state: "idle" });
          const pay = b?.payment || {};
          setPaymentForm({
            stripeAccountId: pay.stripeAccountId || "",
            chargesEnabled: !!pay.chargesEnabled,
            onboardingComplete: !!pay.onboardingComplete,
            payoutsEnabled: !!pay.payoutsEnabled,
          });
        }
      } catch (err) {
        console.error("Failed to load account data", err);
      }
    };
    load();
  }, [user]);

  // Maintain image preview for selected file or existing business image
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!removeImage) {
      setImagePreview(business?.imageUrl || null);
    } else {
      setImagePreview(null);
    }
  }, [imageFile, business, removeImage]);

  // Initialize business form when the business section is opened or business changes
  useEffect(() => {
    if (!showBusinessSection || !business) return;
    setForm({
      name: business.name || "",
      description: business.description || "",
      companyEmail: business.companyEmail || "",
      companyPhone: business.companyPhone || "",
      backgroundColor: business.backgroundColor || "",
      backgroundOpacity: typeof business.backgroundOpacity === 'number' ? business.backgroundOpacity : 1,
      useGradient: !!business.backgroundGradientFrom,
      gradientFrom: business.backgroundGradientFrom || "",
      gradientTo: business.backgroundGradientTo || "",
      gradientAngle: typeof business.backgroundGradientAngle === 'number' ? business.backgroundGradientAngle : 0,
      textColor: business.textColor || "",
    });
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview(business.imageUrl || null);
    let x = 50, y = 50;
    if (typeof business.imagePosition === 'string') {
      const m = business.imagePosition.match(/(\d+)%\s+(\d+)%/);
      if (m) { x = parseInt(m[1], 10); y = parseInt(m[2], 10); }
    }
    setImagePos({ x, y });
  }, [showBusinessSection, business]);

  // Debounced slug availability check when editing
  useEffect(() => {
    if (!business) return;
    const desired = normalizeSlug(slugInput || "");
    if (desired === (business.slug || "")) {
      setSlugStatus({ state: "idle" });
      return;
    }
    if (!desired) {
      setSlugStatus({ state: "idle" });
      return;
    }
    let cancelled = false;
    setSlugStatus({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await checkSlugAvailable(desired);
        if (cancelled) return;
        if (!res.available) {
          const reason = res.reason || "taken";
          setSlugStatus({ state: reason });
        } else {
          setSlugStatus({ state: "available" });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setSlugStatus({ state: "error" });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slugInput, business]);

  // Generate a small preview QR when business or slug changes
  useEffect(() => {
    const gen = async () => {
      if (!business) return;
      try {
        setQrGenerating(true);
        const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/store/${business.slug || business.id}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 288, margin: 2, errorCorrectionLevel: 'M' });
        setQrPreview(dataUrl);
      } catch (e) {
        console.error('QR preview failed', e);
        setQrPreview("");
      } finally {
        setQrGenerating(false);
      }
    };
    gen();
  }, [business?.id, business?.slug]);

  // Keep payment form in sync when opening Payments section
  useEffect(() => {
    if (!showPaymentsSection || !business) return;
    const pay = business?.payment || {};
    setPaymentForm({
      stripeAccountId: pay.stripeAccountId || "",
      chargesEnabled: !!pay.chargesEnabled,
      onboardingComplete: !!pay.onboardingComplete,
      payoutsEnabled: !!pay.payoutsEnabled,
    });
  }, [showPaymentsSection, business]);

  return (
    <>
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Account</h1>

      <section className="mb-6">
        <div
          className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer"
          onClick={() => setShowUserSection((v) => !v)}
        >
          <h2 className="text-xl font-semibold">User</h2>
          <span className="text-blue-600">{showUserSection ? "Hide" : "Show"}</span>
        </div>
        {showUserSection && (
          <div className="mt-2 bg-white p-4 rounded shadow">
            <p className="text-xs text-gray-500 mb-3">
              Note: This user information comes from your sign-in and isn't editable here.
            </p>
            <div className="text-sm">Email: {user?.email}</div>
            <div className="text-sm">UID: {user?.uid}</div>
            {business?.id && (
              <div className="text-sm">Business ID: {business.id}</div>
            )}
            <div className="text-sm">Stripe account ID: {business?.payment?.stripeAccountId || '—'}</div>
            <div className="mt-3">
              <button
                type="button"
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowContactAdmin(true)}
                disabled={!user}
              >
                Contact admin
              </button>
            </div>
          </div>
        )}
      </section>

      

      <section>
        <div className="flex items-center justify-between bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Business</h2>
          <span className="text-blue-600">Moved</span>
        </div>
        <div className="mt-2 bg-white p-4 rounded shadow text-sm">
          Business settings are now managed in the Dashboard. Use the Business panel there to update your store’s name, description, images, and colors.
          <div className="mt-3">
            <a href="/dashboard" className="text-blue-600 underline">Go to Dashboard →</a>
          </div>
        </div>
      </section>

      {/* Landing page / public storefront link and custom address */}
      <section className="mt-6">
        <div
          className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer"
          onClick={() => setShowLandingSection((v) => !v)}
        >
          <h2 className="text-xl font-semibold">Landing page + QR Code</h2>
          <span className="text-blue-600">{showLandingSection ? "Hide" : "Show"}</span>
        </div>
        {showLandingSection && (
        <div className="mt-2 bg-white p-4 rounded shadow">
          {!business && <p className="text-sm text-gray-600">No business found.</p>}
          {business && (
              <div className="space-y-6">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm text-gray-700">Storefront URL:</span>
                <input
                  className="border p-1 rounded text-sm w-full md:w-auto md:min-w-[20rem]"
                  readOnly
                  value={(typeof window !== 'undefined' ? window.location.origin : '') + `/store/${business.slug || business.id}`}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  onClick={async () => {
                    const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/store/${business.slug || business.id}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard');
                    } catch (err) {
                      console.error('Copy failed', err);
                    }
                  }}
                >
                  Copy link
                </button>
                <a
                  href={`/store/${business.slug || business.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  Open
                </a>
              </div>

              <div>
                <label className="block text-sm mb-1">Custom address (optional)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">/store/</span>
                  <input
                    className="border p-2 rounded text-sm w-64"
                    placeholder="your-name"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value)}
                  />
                  {slugStatus.state === 'checking' && (
                    <span className="text-xs text-gray-500">Checking…</span>
                  )}
                  {slugStatus.state === 'available' && (
                    <span className="text-xs text-green-700">Available</span>
                  )}
                  {slugStatus.state === 'taken' && (
                    <span className="text-xs text-red-600">Taken</span>
                  )}
                  {slugStatus.state === 'invalid' && (
                    <span className="text-xs text-red-600">Invalid format</span>
                  )}
                  {slugStatus.state === 'reserved' && (
                    <span className="text-xs text-red-600">Reserved</span>
                  )}
                  {slugStatus.state === 'error' && (
                    <span className="text-xs text-red-600">Error checking</span>
                  )}
                  <button
                    type="button"
                    className="text-sm px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                    disabled={normalizeSlug(slugInput || '') === (business.slug || '') || (slugInput ? slugStatus.state !== 'available' : false)}
                    onClick={async () => {
                      const desired = normalizeSlug(slugInput || '');
                      if (!desired) return;
                      try {
                        const applied = await setBusinessSlug(business.id, desired);
                        const updated = await getBusinessById(business.id);
                        setBusiness(updated);
                        setSlugInput(applied);
                        setSlugStatus({ state: 'idle' });
                        alert('Custom address set');
                      } catch (e) {
                        console.error(e);
                        alert(e?.message === 'taken' ? 'That address was just taken. Try another.' : 'Failed to set address');
                      }
                    }}
                  >
                    Save address
                  </button>
                  {business.slug && (
                    <button
                      type="button"
                      className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={async () => {
                        try {
                          await clearBusinessSlug(business.id);
                          const updated = await getBusinessById(business.id);
                          setBusiness(updated);
                          setSlugInput('');
                          setSlugStatus({ state: 'idle' });
                        } catch (e) {
                          console.error(e);
                          alert('Failed to clear address');
                        }
                      }}
                    >
                      Remove custom address
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">3–30 characters: letters, numbers, and hyphens. No leading or trailing hyphens.</div>
              </div>

              {/* QR code */}
              <div className="mt-4">
                <label className="block text-sm mb-2">Share via QR code</label>
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="border rounded p-2 bg-white inline-flex items-center justify-center w-[160px] h-[160px]">
                    {qrPreview ? (
                      <img width={144} height={144} alt="Storefront QR" src={qrPreview} />
                    ) : (
                      <div className="text-xs text-gray-500">{qrGenerating ? 'Generating…' : 'No QR'}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      disabled={!business}
                      onClick={async () => {
                        try {
                          const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/store/${business.slug || business.id}`;
                          const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' });
                          const a = document.createElement('a');
                          a.href = dataUrl;
                          a.download = `store-${business.slug || business.id}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch (e) {
                          console.error('QR download failed', e);
                          alert('Failed to generate QR');
                        }
                      }}
                    >
                      Download PNG
                    </button>
                    <span className="text-xs text-gray-500">High‑res PNG suitable for printing</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </section>

      {/* Stripe Payments setup (moved below Landing page) */}
      <section className="mt-6">
        <div
          className="flex items-center justify-between bg-white p-4 rounded shadow cursor-pointer"
          onClick={() => setShowPaymentsSection((v) => !v)}
        >
          <h2 className="text-xl font-semibold">Stripe Payments</h2>
          <span className="text-blue-600">{showPaymentsSection ? "Hide" : "Show"}</span>
        </div>
        {showPaymentsSection && (
          <div className="mt-2 bg-white p-4 rounded shadow">
            {!business && <p className="text-sm text-gray-600">No business found.</p>}
            {business && (
              <div>
                {/* Stripe setup instructions */}
                <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  <p className="mb-2 font-medium">Connect your Stripe account</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Click <span className="font-medium">Connect with Stripe</span> below to create a connected account for this business and complete onboarding.
                    </li>
                    <li>
                      Don’t paste an account ID here—this app requires a <span className="font-medium">connected</span> acct_ created via the Connect flow.
                    </li>
                    <li>
                      After onboarding, use <span className="font-medium">Refresh status</span> to sync “Charges enabled” and “Payouts enabled”.
                    </li>
                  </ul>
                </div>

                {/* Stripe actions */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {!paymentForm.stripeAccountId && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                      onClick={async () => {
                        try {
                          const businessId = business.id;
                          await createStripeAccount(businessId);
                          const ret = new URL(window.location.href);
                          ret.hash = 'stripe';
                          const { url } = await createStripeAccountLink(businessId, ret.toString());
                          window.location.assign(url);
                        } catch (e) {
                          console.error(e);
                          alert(`Failed to start Stripe onboarding: ${e?.message || 'Unknown error'}`);
                        }
                      }}
                    >
                      Connect with Stripe
                    </button>
                  )}
                  {paymentForm.stripeAccountId && !paymentForm.onboardingComplete && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
                      onClick={async () => {
                        try {
                          const businessId = business.id;
                          const ret = new URL(window.location.href);
                          ret.hash = 'stripe';
                          const { url } = await createStripeAccountLink(businessId, ret.toString());
                          window.location.assign(url);
                        } catch (e) {
                          console.error(e);
                          alert(`Failed to continue Stripe setup: ${e?.message || 'Unknown error'}`);
                        }
                      }}
                    >
                      Continue Stripe setup
                    </button>
                  )}
                  {paymentForm.stripeAccountId && (
                    <>
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                        onClick={async () => {
                          try {
                            const flags = await syncStripeAccount(business.id);
                            setPaymentForm((prev) => ({ ...prev, ...flags }));
                            // also refresh business state to keep others in sync
                            const updated = await getBusinessById(business.id);
                            setBusiness(updated);
                          } catch (e) {
                            console.error(e);
                            alert(`Failed to refresh status: ${e?.message || 'Unknown error'}`);
                          }
                        }}
                      >
                        Refresh status
                      </button>
                    </>
                  )}
                </div>
                {/* Stripe status flags (read-only badges) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Charges enabled</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${paymentForm.chargesEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {paymentForm.chargesEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Indicates whether your account can accept payments.</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Onboarding complete</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${paymentForm.onboardingComplete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {paymentForm.onboardingComplete ? 'Complete' : 'Incomplete'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">You've submitted required details to Stripe.</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Payouts enabled</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${paymentForm.payoutsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {paymentForm.payoutsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">Allows transfers to your bank account.</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">These values are synced from Stripe and not editable here.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
    <ContactAdminModal
      isOpen={showContactAdmin}
      onClose={() => setShowContactAdmin(false)}
      userId={user?.uid}
      businessId={business?.id}
      defaultEmail={user?.email || ""}
    />
  </>
  );
}
