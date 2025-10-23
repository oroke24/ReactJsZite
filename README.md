# Zite — Shopify-like storefront (React + Firebase)

Zite is a minimal Shopify-like app built with React and Firebase. Users register/login, a default business is created automatically, and they can manage collections and items from a dashboard. The public storefront displays items grouped by collections.

## Overview

- Tech: React (Vite), React Router, Firebase (Auth, Firestore, Storage), Tailwind v4.
- Auth: On registration, a default business is created and stored under `users/{uid}.primaryBusinessId`.
- Data model (Firestore):
	- `businesses/{businessId}` — business profile (name, description, contact fields, optional backgroundColor for storefront, optional imageUrl)
	- `businesses/{businessId}/items` — all sellable items (single unified collection)
	- `businesses/{businessId}/collections` — collections with optional description and backgroundColor (hex)
	- `businesses/{businessId}/collections/{collectionId}/items/{itemId}` — membership docs (item belongs to collection)

Items can belong to multiple collections via membership docs. The storefront renders sections per collection and lists its member items. Each collection can include an optional description and background color that appear on the storefront.

## Key routes

- `src/pages/Register.jsx` — registers user and initializes default business
- `src/pages/Account.jsx` — edit business profile (name/description/contact)
- `src/pages/Dashboard.jsx` — manage collections and items
- `src/pages/Storefront.jsx` — public storefront grouped by collections

## Components and libs

- `src/components/ItemManager.jsx` — CRUD for items (with image upload)
- `src/components/CollectionsManager.jsx` — create/delete collections, edit collection description, and manage item membership
- `src/lib/items.js` — Firestore helpers for items
- `src/lib/firestore.js` — business, user profile, and collections helpers

Note: The project has been fully refactored to an items-only model. Any legacy product/services files are no longer used and can be safely removed.

## Development

- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Preview build: `npm run preview`

Ensure Firebase config is set in `src/firebaseConfig.js` and your Firestore/Storage security rules are aligned with the paths above.
The business image (imageUrl) can be uploaded/updated/cleared from the Account page and displays on the Storefront header.
Business and collection backgrounds are optional; clearing the color removes the field from Firestore.
