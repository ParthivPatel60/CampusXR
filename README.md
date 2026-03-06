# CampusXR

A React + Vite app for creating and viewing interactive campus 360° tours with an admin panel.

## Quick start

1. Install dependencies
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

## Folder structure

campusxr/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   │   ├── react.svg
│   │   └── Terrace.jpg.jpeg
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminRoute.jsx
│   │   ├── layout/
│   │   │   └── ViewerOverlay.jsx
│   │   ├── nav/
│   │   ├── ui/
│   │   │   ├── HotspotMarker.jsx
│   │   │   ├── LocationLabel.jsx
│   │   │   ├── NavbarGlass.jsx
│   │   │   └── SideControls.jsx
│   │   └── viewer/
│   │       └── PanoramaViewer.jsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminPanel.jsx
│   │   │   └── LoginPage.jsx
│   │   └── UserTourPage.jsx
│   ├── services/
│   │   └── firestoreService.js
│   ├── cloudinary.js
│   ├── dataStore.js
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── Design_Doc.md
│   ├── PRD.md
│   └── Tech_Stack.md
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── vite.config.js
└── final_ppt.pdf

## Notes

- Uses Firebase and Cloudinary integrations (see src/).
- See docs/ for API and architecture details.