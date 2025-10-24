import { auth, firebaseProjectId } from "../firebaseConfig";

async function authFetch(path, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let body;
    try { body = await res.json(); msg = body.error || msg; } catch (_) { /* ignore */ }
    const err = new Error(msg);
    err.status = res.status;
    if (body) err.body = body;
    throw err;
  }
  return res.json();
}

function getBase() {
  const isViteDev = typeof window !== 'undefined' && window.location.host.includes('localhost:5173');
  if (isViteDev && firebaseProjectId) {
    // Point to Functions emulator
    return `http://127.0.0.1:5001/${firebaseProjectId}/us-central1/api/stripe`;
  }
  return '/api/stripe';
}
const base = getBase();

export async function createStripeAccount(businessId) {
  return authFetch(`${base}/createAccount`, { method: 'POST', body: JSON.stringify({ businessId }) });
}

export async function createStripeAccountLink(businessId, returnUrl) {
  return authFetch(`${base}/createAccountLink`, { method: 'POST', body: JSON.stringify({ businessId, returnUrl }) });
}

export async function getStripeDashboardLink(businessId) {
  return authFetch(`${base}/dashboardLink?businessId=${encodeURIComponent(businessId)}`);
}

export async function syncStripeAccount(businessId) {
  return authFetch(`${base}/syncAccount`, { method: 'POST', body: JSON.stringify({ businessId }) });
}

export async function createCheckoutSession(businessId, payload) {
  return authFetch(`${base}/createCheckoutSession`, { method: 'POST', body: JSON.stringify({ businessId, ...payload }) });
}

// Public endpoint for buyers (no auth)
async function publicFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let body;
    try { body = await res.json(); msg = body.error || msg; } catch (_) { /* ignore */ }
    const err = new Error(msg);
    err.status = res.status;
    if (body) err.body = body;
    throw err;
  }
  return res.json();
}

export async function createPublicCheckoutSession(businessId, payload) {
  const pubBase = base; // same base; route is /createCheckoutSessionPublic
  return publicFetch(`${pubBase}/createCheckoutSessionPublic`, { method: 'POST', body: JSON.stringify({ businessId, ...payload }) });
}
