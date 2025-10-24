import functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import admin from 'firebase-admin';
import Stripe from 'stripe';
import express from 'express';
import cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const STRIPE_SECRET = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK = defineSecret('STRIPE_WEBHOOK_SECRET');

let stripeClient = null;
function getStripe() {
  const key = STRIPE_SECRET.value();
  if (!key) return null;
  if (!stripeClient || stripeClient._key !== key) {
    stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
    stripeClient._key = key; // mark for reuse
  }
  return stripeClient;
}

async function verifyAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing Authorization' });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    console.error('Auth error', e);
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function ensureOwner(req, res, next) {
  try {
    const businessId = req.body.businessId || req.query.businessId || req.user?.uid;
    if (!businessId) return res.status(400).json({ error: 'Missing businessId' });
    // In this app, business id == owner uid
    if (businessId !== req.user.uid) return res.status(403).json({ error: 'Not your business' });
    req.businessId = businessId;
    // Optionally ensure doc exists
    const ref = db.doc(`businesses/${businessId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Business not found' });
    req.business = { id: businessId, ...snap.data() };
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/stripe/createAccount', verifyAuth, ensureOwner, async (req, res) => {
  try {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const businessId = req.businessId;
    const pay = req.business.payment || {};
    if (pay.stripeAccountId) {
      return res.json({ stripeAccountId: pay.stripeAccountId });
    }
    const acct = await stripe.accounts.create({
      type: 'express',
      email: req.business.companyEmail || undefined,
      business_type: 'individual'
    });
    await db.doc(`businesses/${businessId}`).set({ payment: { ...(pay || {}), stripeAccountId: acct.id, method: 'Stripe' } }, { merge: true });
    res.json({ stripeAccountId: acct.id });
  } catch (e) {
    console.error('createAccount error', e);
    const msg = (e && e.message) ? e.message : 'createAccount failed';
    res.status(500).json({ error: msg });
  }
});
// Duplicate route with /api prefix for Hosting rewrites
app.post('/api/stripe/createAccount', verifyAuth, ensureOwner, async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

app.post('/stripe/createAccountLink', verifyAuth, ensureOwner, async (req, res) => {
  try {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const businessId = req.businessId;
    const pay = (await db.doc(`businesses/${businessId}`).get()).data()?.payment || {};
    const account = pay.stripeAccountId;
    if (!account) return res.status(400).json({ error: 'No Stripe account' });
    // Validate account belongs to this platform and isn't the platform account itself
    const platform = await stripe.accounts.retrieve();
    if (account === platform.id) {
      return res.status(400).json({ error: 'Configured Stripe account is your platform account. Use Connect to create a connected account for this business.' });
    }
    let connected;
    try { connected = await stripe.accounts.retrieve(account); } catch (err) {
      return res.status(400).json({ error: 'That Stripe account ID is not connected to this platform. Click “Connect with Stripe” instead of pasting an ID.' });
    }
    const returnUrl = req.body.returnUrl || `${req.headers.origin || ''}/account#stripe`;
    const link = await stripe.accountLinks.create({
      account,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });
    res.json({ url: link.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'createAccountLink failed' });
  }
});
app.post('/api/stripe/createAccountLink', verifyAuth, ensureOwner, async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

app.get('/stripe/dashboardLink', verifyAuth, ensureOwner, async (req, res) => {
  try {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const account = req.business.payment?.stripeAccountId;
    if (!account) return res.status(400).json({ error: 'No Stripe account' });
    const link = await stripe.accounts.createLoginLink(account);
    res.json({ url: link.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'dashboardLink failed' });
  }
});
app.get('/api/stripe/dashboardLink', verifyAuth, ensureOwner, async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

app.post('/stripe/syncAccount', verifyAuth, ensureOwner, async (req, res) => {
  try {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const businessId = req.businessId;
    const account = req.business.payment?.stripeAccountId;
    if (!account) return res.status(400).json({ error: 'No Stripe account' });
    // Validate that the account is a connected account for this platform
    const platform = await stripe.accounts.retrieve();
    if (account === platform.id) {
      return res.status(400).json({ error: 'Configured Stripe account is your platform account. Use Connect to create a connected account for this business.' });
    }
    let acct;
    try { acct = await stripe.accounts.retrieve(account); } catch (err) {
      return res.status(400).json({ error: 'Stripe account ID is not connected to this platform. Use the Connect flow instead of pasting an ID.' });
    }
    const flags = {
      chargesEnabled: !!acct.charges_enabled,
      payoutsEnabled: !!acct.payouts_enabled,
      onboardingComplete: !!acct.details_submitted
    };
    await db.doc(`businesses/${businessId}`).set({ payment: { ...(req.business.payment || {}), ...flags } }, { merge: true });
    res.json(flags);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'syncAccount failed' });
  }
});
app.post('/api/stripe/syncAccount', verifyAuth, ensureOwner, async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

app.post('/stripe/createCheckoutSession', verifyAuth, async (req, res) => {
  try {
  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { businessId, orderId, lineItems, currency = 'usd', successUrl, cancelUrl, customerEmail } = req.body || {};
    if (!businessId) return res.status(400).json({ error: 'Missing businessId' });
    if (businessId !== req.user.uid) return res.status(403).json({ error: 'Not your business' });
    const snap = await db.doc(`businesses/${businessId}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'Business not found' });
    const pay = snap.data()?.payment || {};
    if (!pay.stripeAccountId) return res.status(400).json({ error: 'Business not connected to Stripe' });
    // Guard against using platform account as destination
    const platform = await stripe.accounts.retrieve();
    if (pay.stripeAccountId === platform.id) {
      return res.status(400).json({ error: 'Configured Stripe account is your platform account. Please connect a separate account via the Stripe Connect button in Account → Stripe Payments.' });
    }
    // Validate connected account exists and is chargeable
    let connected;
    try { connected = await stripe.accounts.retrieve(pay.stripeAccountId); } catch (err) {
      return res.status(400).json({ error: 'Stripe account ID is not a connected account for this platform. Use the Connect flow instead of pasting an ID.' });
    }
    if (!connected.charges_enabled) {
      return res.status(400).json({ error: 'Stripe account not ready: charges disabled. Complete onboarding first.' });
    }
    if (!Array.isArray(lineItems) || !lineItems.length) return res.status(400).json({ error: 'lineItems required' });
    const items = lineItems.map(li => ({
      price_data: {
        currency,
        product_data: { name: li.name, ...(li.image ? { images: [li.image] } : {}) },
        unit_amount: Math.round(li.amount)
      },
      quantity: Math.max(1, parseInt(li.quantity || 1, 10))
    }));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        transfer_data: { destination: pay.stripeAccountId }
      },
      metadata: {
        businessId,
        ...(orderId ? { orderId } : {})
      }
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'createCheckoutSession failed' });
  }
});
app.post('/api/stripe/createCheckoutSession', verifyAuth, async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

// Public checkout session creation for buyers (no auth). Validates prices server-side.
app.post('/stripe/createCheckoutSessionPublic', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { businessId, orderId, itemId, quantity = 1, successUrl, cancelUrl, customerEmail } = req.body || {};
    if (!businessId || !itemId) return res.status(400).json({ error: 'Missing businessId or itemId' });
    const bizSnap = await db.doc(`businesses/${businessId}`).get();
    if (!bizSnap.exists) return res.status(404).json({ error: 'Business not found' });
    const pay = bizSnap.data()?.payment || {};
    if (!pay.stripeAccountId) return res.status(400).json({ error: 'Business not connected to Stripe' });
    // Guard against using platform account as destination
    const platform = await stripe.accounts.retrieve();
    if (pay.stripeAccountId === platform.id) {
      return res.status(400).json({ error: 'Configured Stripe account is your platform account. Please connect a separate account via the Stripe Connect button in Account → Stripe Payments.' });
    }
    // Validate connected account exists and is chargeable
    let connected;
    try { connected = await stripe.accounts.retrieve(pay.stripeAccountId); } catch (err) {
      return res.status(400).json({ error: 'Stripe account ID is not a connected account for this platform. Use the Connect flow instead of pasting an ID.' });
    }
    if (!connected.charges_enabled) {
      return res.status(400).json({ error: 'Stripe account not ready: charges disabled. Complete onboarding first.' });
    }
    // Fetch item to compute trusted amount
    const itemSnap = await db.doc(`businesses/${businessId}/items/${itemId}`).get();
    if (!itemSnap.exists) return res.status(404).json({ error: 'Item not found' });
    const item = itemSnap.data();
    const unit = Math.round(parseFloat(item.price || 0) * 100);
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Force card-only if desired by uncommenting the next line
      // payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: item.name, ...(item.imageUrl ? { images: [item.imageUrl] } : {}) },
            unit_amount: unit
          },
          quantity: qty
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        transfer_data: { destination: pay.stripeAccountId }
      },
      metadata: {
        businessId,
        ...(orderId ? { orderId } : {}),
        itemId,
        quantity: String(qty)
      }
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('createCheckoutSessionPublic error', e);
    const msg = (e && e.message) ? e.message : 'createCheckoutSessionPublic failed';
    res.status(500).json({ error: msg });
  }
});
app.post('/api/stripe/createCheckoutSessionPublic', async (req, res) => {
  return app._router.handle({ ...req, url: req.url.replace('/api', '') }, res, () => {});
});

// Webhook: needs raw body
const webhook = express();
webhook.use(express.raw({ type: 'application/json' }));
webhook.post('/stripe/webhook', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(500).send('Stripe not configured');
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK.value());
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case 'account.updated': {
        const acct = event.data.object;
        const acctId = acct.id;
        // find business with this acct id (business id == owner uid)
        const snap = await db.collection('businesses').where('payment.stripeAccountId', '==', acctId).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          await doc.ref.set({ payment: {
            ...(doc.data().payment || {}),
            chargesEnabled: !!acct.charges_enabled,
            payoutsEnabled: !!acct.payouts_enabled,
            onboardingComplete: !!acct.details_submitted
          } }, { merge: true });
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        const orderId = session.metadata?.orderId;
        if (businessId && orderId) {
          try {
            await db.doc(`businesses/${businessId}/orders/${orderId}`).set({ status: 'paid', stripeSessionId: session.id, paidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          } catch (e) {
            console.error('Failed to mark order paid', e);
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook error', e);
    res.status(500).send('Webhook handler failed');
  }
});

export const api = functions.region('us-central1').runWith({ secrets: [STRIPE_SECRET, STRIPE_WEBHOOK] }).https.onRequest(app);
export const stripeWebhook = functions.region('us-central1').runWith({ secrets: [STRIPE_SECRET, STRIPE_WEBHOOK] }).https.onRequest(webhook);
