# CampusXR

A React + Vite app for creating and viewing interactive campus 360° tours with an admin panel.

## Quick start

1. Install frontend dependencies
   ```
   npm install
   ```
2. Run dev server
   ```
   npm run dev
   ```
3. Build for production
   ```
   npm run build
   ```

## Seeding Firestore / Cloudinary (one-time)

```bash
npm run seed:install   # install scripts/ deps (first time only)
npm run seed           # upload images & write Firestore metadata
npm run seed:dry       # dry-run (no writes)
```

## Folder structure

CampusXR/                     ← repo root (also the frontend app)
├── public/                   ← static assets
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── admin/            ← AdminRoute guard
│   │   ├── layout/           ← ViewerOverlay
│   │   ├── ui/               ← NavbarGlass, SideControls, etc.
│   │   └── viewer/           ← PanoramaViewer (Three.js / Pannellum)
│   ├── pages/
│   │   ├── admin/            ← AdminPanel, LoginPage
│   │   └── UserTourPage.jsx
│   ├── services/
│   │   └── firestoreService.js
│   ├── cloudinary.js
│   ├── dataStore.js          ← deprecated, kept for reference
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
├── scripts/                  ← one-time Firestore/Cloudinary seed utility
│   ├── seed.js
│   ├── seed-manifest.json
│   └── package.json          ← separate deps (firebase-admin, cloudinary SDK)
├── docs/                     ← architecture, API, design docs
├── eslint.config.js
├── index.html
├── package.json
├── vite.config.js
└── .gitignore

## Notes

- Firebase config lives in `src/firebase.js` (hardcoded for this project; use `.env` in production).
- Cloudinary upload helper in `src/cloudinary.js`.
- See `docs/` for API and architecture details.