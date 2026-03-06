# CampusXR — Tech Stack Document

**Version:** 1.2 | **Audience:** Dev Team (Internal) | **Hackathon Edition — February 2026**
**Changelog:**
- v1.2 — Specified `@mkkellogg/gaussian-splats-3d` as the 3DGS loader library; added `react-router-dom ^6.x`; documented Cloudinary upload preset raw format allowance
- v1.1 — Migrated file storage from Firebase Storage to Cloudinary

---

## Table of Contents

1. [Stack at a Glance](#1-stack-at-a-glance)
2. [Frontend Core](#2-frontend-core)
3. [Rendering & Animation Libraries](#3-rendering--animation-libraries)
4. [Backend & Infrastructure](#4-backend--infrastructure)
5. [How Everything Integrates](#5-how-everything-integrates)
6. [Project Setup & Installation](#6-project-setup--installation)
7. [Package Reference](#7-package-reference)

---

## 1. Stack at a Glance

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | `^19.2.4` |
| Routing | react-router-dom | `^6.x` |
| Build Tool | Vite | `^6.x` (latest) |
| Styling | Tailwind CSS v4 + `@tailwindcss/vite` | `^4.x` |
| 360° Viewer | Pannellum | `^2.5.6` (CDN) |
| 3DGS Renderer | Three.js | `^0.183.2` |
| 3DGS Loader | `@mkkellogg/gaussian-splats-3d` | `^0.x` (latest) |
| Animations | GSAP + `@gsap/react` | `^3.14.2` + `^2.1.2` |
| Database | Firebase Firestore | `firebase ^12.x` |
| File Storage | **Cloudinary** | Cloudinary REST Upload API (no SDK needed on client) |
| Authentication | Firebase Auth | `firebase ^12.x` |
| Hosting | Firebase Hosting | free tier |

> **v1.1 change:** Firebase Storage has been replaced with Cloudinary for all image and scene file hosting. The Firebase SDK is retained for Firestore and Auth only — `getStorage` is no longer imported.

---

## 2. Frontend Core

### 2.1 React `^19.2.4`

**Why React?**

Your UI has three live state variables that drive nearly every element on screen: `activeDept`, `activeRoom`, and `sidePanelOpen`. In vanilla JS, keeping the nav breadcrumb, room list, hotspot panel, and 3DGS toggle all in sync with those three values manually is where hackathon teams lose hours to subtle bugs. React makes every dependent element re-render automatically when state changes — no `document.querySelector` chains, no forgetting to update a label.

The Admin Panel is the other big win. Forms, auth-gated routing, real-time Firestore listeners, and file upload state are all patterns React handles cleanly. Doing that in vanilla JS in a 24-hour window is genuinely painful.

**Why React 19 specifically?**

React 19 is the current stable release. No reason to pin to 18 — 19 is broadly compatible, well-documented, and the version you'll get by default when scaffolding with Vite today.

**Key hooks you'll use in this project:**

- `useState` — `activeDept`, `activeRoom`, `isSidePanelOpen`, `is3DGSMode`
- `useEffect` — mounting Pannellum and Three.js into DOM refs, setting up Firestore listeners
- `useRef` — holding references to the Pannellum viewer instance and the Three.js canvas
- `useContext` (optional) — sharing Firebase auth state across the Admin Panel without prop drilling

---

### 2.2 React Router DOM `^6.x`

**Why react-router-dom?**

CampusXR has three distinct routes:

| Route | Component | Access |
|---|---|---|
| `/` | `<TourPage />` | Public |
| `/admin` | `<AdminDashboard />` (via `<AdminRoute>`) | Protected |
| `/login` | `<LoginPage />` | Public |

React Router v6 handles client-side navigation between these routes within the SPA. The `<BrowserRouter>` and `<Routes>`/`<Route>` primitives replace any `window.location` hacks.

**Router setup in `src/main.jsx` or `src/App.jsx`:**

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TourPage        from "./pages/TourPage";
import AdminDashboard  from "./pages/AdminDashboard";
import LoginPage       from "./pages/LoginPage";
import AdminRoute      from "./routes/AdminRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<TourPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**Install:**

```bash
npm install react-router-dom
```

> **Firebase Hosting SPA note:** Ensure `firebase.json` has `"rewrites": [{ "source": "**", "destination": "/index.html" }]` so direct URL navigation (e.g. typing `/admin` in the browser) is handled by the React app, not a 404.

---

### 2.3 Vite `^6.x`

**Why Vite?**

Vite is the standard build tool for React projects in 2026. Two reasons it matters specifically in a hackathon context:

1. **Instant hot module replacement.** Every time you save a file, your browser reflects the change in under 100ms. Over 24 hours, that adds up to real time saved.
2. **Zero config to start.** `npm create vite@latest` gives you a working React + JSX setup in about 60 seconds, with no webpack configuration to wrestle with.

Vite also has first-party Tailwind CSS v4 plugin support, so the entire CSS pipeline is handled by a single entry in `vite.config.js`.

---

### 2.3 Tailwind CSS v4 + `@tailwindcss/vite`

**Why Tailwind?**

Your glassmorphism design system — the backdrop blur, gradient backgrounds, border-radius, and drop shadows — involves several custom CSS values that need to be consistent across the Bottom Nav Bar, Info Side Panel, Admin Hotspot Editor Popup, and Search Dropdown. Writing that as raw CSS means four separate class definitions that must stay in sync. With Tailwind, you define the values once as custom tokens and apply them as utility classes everywhere.

**Why Tailwind v4 specifically?**

Tailwind v4 introduced a **first-party Vite plugin** (`@tailwindcss/vite`) which replaces the old PostCSS config approach. The result is:

- No `tailwind.config.js` file to maintain.
- No `postcss.config.js` file.
- Automatic content detection — Tailwind scans your files automatically.
- Just one import in your CSS: `@import "tailwindcss"`.
- Noticeably faster builds.

This is strictly less configuration overhead, which matters at 3am in a hackathon.

**Glassmorphism custom tokens in Tailwind v4 (CSS-based config):**

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-navy: #1A365D;
  --color-academic-blue: #0047AB;
  --color-nav-green: #10B981;
  --color-amber-glow: #F59E0B;
  --color-glass-border: rgba(209, 213, 219, 0.4);
  --blur-glass: 35px;
  --radius-glass: 14px;
}
```

---

## 3. Rendering & Animation Libraries

### 3.1 Pannellum `^2.5.6` (via CDN)

**Why Pannellum?**

Pannellum is purpose-built for exactly what you need: loading equirectangular 360° images with clickable hotspots and JSON-configurable scene switching. It handles pitch/yaw coordinate systems, hotspot click events (which you need for the Hotspot Editor), and cross-room transitions out of the box. It requires zero WebGL expertise to use.

**Why CDN instead of npm?**

Pannellum is not designed as an ES module and doesn't integrate cleanly into a Vite/React build via npm. The standard approach for React projects is to load it via CDN in `index.html` and mount it imperatively into a `ref` inside a `useEffect`. This is the documented pattern and it works well.

**How Pannellum mounts inside React:**

```jsx
// src/components/PanoramaViewer.jsx
import { useEffect, useRef } from "react";

export default function PanoramaViewer({ imageURL, hotspots, onHotspotClick }) {
  const viewerRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!viewerRef.current || !imageURL) return;

    // imageURL is a Cloudinary secure_url — passed directly to Pannellum
    instanceRef.current = window.pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: imageURL,        // Cloudinary secure_url from Firestore
      hotSpots: hotspots,
      autoLoad: true,
    });

    return () => instanceRef.current?.destroy();
  }, [imageURL, hotspots]); // Re-mount when room changes OR hotspots array updates

  return <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />;
}
```

**Add to `index.html`:**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
<script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
```

---

### 3.2 Three.js `^0.183.2` + `@mkkellogg/gaussian-splats-3d`

**Why Three.js?**

Three.js provides the WebGL renderer, camera, and scene graph. On its own it cannot load `.splat` / `.ply` Gaussian Splat files — a dedicated loader library is required.

**Why `@mkkellogg/gaussian-splats-3d`?**

This package is the correct, maintained library for loading Gaussian Splat scenes in a Three.js context. It exposes a high-level `Viewer` API that handles scene loading, orbit controls, and rendering internally. The earlier `GaussianSplatLoader()` reference in prior doc drafts was incorrect — that class does not exist.

**Install:**

```bash
npm install three @mkkellogg/gaussian-splats-3d
```

**How `@mkkellogg/gaussian-splats-3d` mounts inside React:**

```jsx
// src/components/ThreeDGSViewer.jsx
import { useEffect, useRef } from "react";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

export default function ThreeDGSViewer({ sceneURL }) {
  // sceneURL is a Cloudinary secure_url for the .splat or .ply scene file
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !sceneURL) return;

    const viewer = new GaussianSplats3D.Viewer({
      rootElement: containerRef.current,
    });

    viewer
      .addSplatScene(sceneURL)  // sceneURL = Cloudinary secure_url (.splat / .ply)
      .then(() => {
        viewer.start();
      });

    return () => {
      viewer.stop();
      viewer.dispose();
    };
  }, [sceneURL]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

**Coexistence with Pannellum:**

The 3DGS viewer is conditionally rendered via a React state flag (`is3DGSMode`). When `is3DGSMode` is `false`, the `<ThreeDGSViewer />` component is unmounted and its `useEffect` cleanup runs `viewer.dispose()`. The `<PanoramaViewer />` component remains mounted in the DOM and visible — it is hidden via CSS (`display: none` or `z-index` layering) while 3DGS mode is active, not destroyed.

```jsx
{/* PanoramaViewer stays mounted; hidden via CSS when 3DGS is active */}
<div style={{ display: is3DGSMode ? "none" : "block", width: "100%", height: "100%" }}>
  <PanoramaViewer imageURL={activeRoom.imageURL} hotspots={activeRoom.hotspots} />
</div>

{/* ThreeDGSViewer conditionally rendered */}
{is3DGSMode && <ThreeDGSViewer sceneURL={activeRoom.splat3DUrl} />}

---

### 3.3 GSAP `^3.14.2` + `@gsap/react ^2.1.2`

**Why GSAP?**

GSAP is the industry standard for JavaScript animation. In your project it drives four specific interactions:

| Animation | GSAP Usage |
|---|---|
| Bottom navigation bar slide-up on page load | `gsap.from(navRef.current, { y: 100, opacity: 0 })` |
| Info side panel slide-in from right | `gsap.from(panelRef.current, { x: "100%", ease: "power2.out" })` |
| Experimental 3DGS toggle pulse/glow | `gsap.to(toggleRef.current, { repeat: -1, yoyo: true })` |
| Room-to-room fade + rotate transition | `gsap.timeline()` sequencing opacity and rotation |

**Why `@gsap/react`?**

The `@gsap/react` package provides a `useGSAP()` hook which is a drop-in replacement for `useEffect()`. The critical advantage is **automatic cleanup** — all GSAP animations, timelines, and tweens created inside `useGSAP()` are automatically reverted when the component unmounts. Without this, you can get memory leaks and animations that continue running on unmounted components.

```jsx
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function BottomNavBar() {
  const navRef = useRef(null);

  useGSAP(() => {
    gsap.from(navRef.current, { y: 80, opacity: 0, duration: 0.6, ease: "power2.out" });
  }, { scope: navRef });

  return <nav ref={navRef}>...</nav>;
}
```

**GSAP is now 100% free.** As of 2024, Webflow's sponsorship made all GSAP plugins (including SplitText, MorphSVG, ScrollTrigger) free for commercial use. No Club GSAP membership required.

---

## 4. Backend & Infrastructure

### 4.1 Firebase JS SDK `^12.x` (Firestore + Auth only)

> **v1.1 change:** Firebase Storage is no longer used. The `getStorage` import has been removed from `src/firebase.js`. The Firebase SDK is retained exclusively for Firestore (data) and Auth (admin login). Remove any `storageBucket` config and `getStorage` references from your project.

**Why keep Firebase at all?**

Firestore provides a zero-config, real-time NoSQL database that fits the hierarchical campus data model (Campus → Department → Room) perfectly. Firebase Auth handles multi-admin email/password login without any custom server code. Both remain the right tools for those jobs.

**A note on `react-firebase-hooks`:**

You may have seen recommendations for `react-firebase-hooks` as a convenience wrapper. Be aware that it was last published 3 years ago (v5.1.1) and has not been updated to track the latest Firebase SDK. For a hackathon build on Firebase v12, use the **Firebase SDK directly** — the raw API is clean and well-documented.

```js
// Direct Firebase SDK — recommended
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

useEffect(() => {
  const unsub = onSnapshot(collection(db, "departments"), (snap) => {
    setDepts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsub(); // cleanup
}, []);
```

**Firestore — how the app reads data:**

| What | Query |
|---|---|
| All departments on page load | `getDocs(collection(db, "departments"))` |
| Rooms for a department | `getDocs(collection(db, "departments", deptId, "rooms"))` |
| Hotspots for a room | Embedded in the room document as an array — no extra query needed |
| Admin live updates | `onSnapshot(...)` listener on a collection |

**`src/firebase.js` — updated for v1.1:**

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";
// getStorage removed — Cloudinary handles all file storage

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
  // storageBucket intentionally omitted
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
// export const storage = getStorage(app); // REMOVED in v1.1
```

**Firebase Auth — protecting the Admin Panel:**

```jsx
// src/routes/AdminRoute.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return () => unsub();
  }, []);

  if (user === undefined) return <p>Loading...</p>;
  return user ? children : <Navigate to="/login" />;
}
```

---

### 4.2 Cloudinary (REST Upload API — no SDK required on client)

> **v1.1 addition:** Cloudinary replaces Firebase Storage for all image and 3DGS scene file hosting.

**Why Cloudinary?**

Cloudinary replaces Firebase Storage for all image and 3DGS scene file hosting. It provides:

- **Upload API** — accepts file uploads via `multipart/form-data`; returns a `secure_url` and `public_id` immediately.
- **Global CDN delivery** — images are served over HTTPS from edge nodes; Pannellum and Three.js receive them like any standard HTTPS URL.
- **Image transformations** — auto-resize, format conversion, and compression available on-the-fly via URL parameters (useful post-hackathon).
- **Free tier** — 25GB storage + 25GB bandwidth/month; sufficient for a hackathon demo with ≤10 rooms.

**Why not Firebase Storage?**

Firebase Storage requires `getStorage()`, `ref()`, `uploadBytes()`, and `getDownloadURL()` — four separate async calls to upload a single image and retrieve its URL. Cloudinary reduces this to a single `fetch()` POST that returns the URL directly. Fewer moving parts in a 24-hour build.

**Upload flow:**

```
Admin selects file
  → POST multipart/form-data to Cloudinary Upload API
    → Returns { secure_url, public_id }
      → secure_url written to Firestore as roomId/imageURL
        → Pannellum reads imageURL from Firestore → renders panorama
```

**Client-side upload utility (unsigned preset — recommended for hackathon):**

```js
// src/utils/uploadImage.js
// No API secret required — uses unsigned upload preset configured in Cloudinary dashboard

export async function uploadImageToCloudinary(file, folder = "campusxr/rooms") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Cloudinary upload failed");

  const data = await res.json();
  return {
    url:      data.secure_url,     // write to Firestore as imageURL
    publicId: data.public_id,      // write to Firestore as imagePublicId
  };
}
```

**For 3DGS scene files** (`.splat`, `.ply`), use the `raw` resource type endpoint:

```js
// src/utils/uploadScene.js
export async function uploadSceneToCloudinary(file, folder = "campusxr/scenes") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Cloudinary scene upload failed");

  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
```

**Migration reference — Firebase Storage → Cloudinary:**

| Firebase Storage (removed) | Cloudinary equivalent |
|---|---|
| `import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"` | No import — uses `fetch()` |
| `const storage = getStorage(app)` | Removed from `src/firebase.js` |
| `const storageRef = ref(storage, "images/room.jpg")` | `folder` param in `FormData` |
| `await uploadBytes(storageRef, file)` | `await fetch(...cloudinary.../image/upload, { body: formData })` |
| `const url = await getDownloadURL(storageRef)` | `data.secure_url` from JSON response |

**Cloudinary dashboard setup (one-time, ~5 minutes):**

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Navigate to **Settings → Upload → Upload presets**.
3. Click **Add upload preset**.
4. Set **Signing mode** to `Unsigned`.
5. Set preset name to `campusxr_upload`.
6. Set default folder to `campusxr`.
7. **Allowed formats** — Under the upload preset settings, set the allowed formats to include `splat` and `ply` (in addition to standard image formats). Alternatively, set the field to **Any format** to avoid upload rejections for 3DGS scene files.
8. Save.

> ⚠️ **Important for 3DGS uploads:** Cloudinary upload presets default to image-only acceptance. Without explicitly allowing `splat` and `ply` formats (or selecting **Any format**), scene file uploads will be rejected even when using the `/raw/upload` endpoint with this preset.

**Required environment variables:**

```bash
# .env.local
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=campusxr_upload

# Server-side only — never prefix with VITE_
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> ⚠️ `CLOUDINARY_API_SECRET` must **never** be included in the Vite client bundle. Only `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are safe to expose to the browser.

---

### 4.3 Firebase Hosting (free tier)

**Why Firebase Hosting?**

Zero-config deployment that integrates directly with the Firebase project already used for Firestore and Auth. One CLI command deploys the Vite build output.

```bash
npm run build          # Vite builds to /dist
firebase deploy        # Deploys /dist to Firebase Hosting
```

The free Spark plan is sufficient for hackathon scale. Note: Firebase Hosting serves the React app bundle only — all media (360° images, 3DGS scenes) is served from Cloudinary's CDN, so Firebase Hosting bandwidth is not consumed by media assets.

---

## 5. How Everything Integrates

```
React (Vite) — app shell, state, routing
│
├── PanoramaViewer.jsx
│   └── Pannellum (CDN) mounted into useRef div
│       ├── Reads imageURL (Cloudinary secure_url) from Firestore
│       └── Hotspot click events → React state updates
│
├── ThreeDGSViewer.jsx (conditionally rendered)
│   └── Three.js mounted into useRef canvas
│       └── Reads 3DGS scene file from Cloudinary CDN (secure_url)
│
├── BottomNavBar.jsx + InfoSidePanel.jsx
│   └── GSAP + @gsap/react animates DOM refs
│
├── Firebase Firestore
│   └── Provides: departments, rooms, hotspot arrays
│       Room imageURL field = Cloudinary secure_url
│       Read by: User Tour Page (onSnapshot / getDocs)
│       Written by: Admin Panel
│
├── Cloudinary CDN
│   └── Hosts: 360° panorama images, hotspot images, 3DGS scene files
│       Upload: REST API via fetch() — unsigned preset, no SDK needed
│       Delivery: HTTPS secure_url → Pannellum, Three.js, InfoSidePanel
│       Upload writes: secure_url + public_id → Firestore
│
└── Firebase Auth
    └── Protects: /admin route
        Used by: AdminRoute.jsx wrapper component
```

**The key integration rule: Pannellum and Three.js are imperative libraries living inside React's world via `useRef` + `useEffect`. React manages when they mount and unmount. Neither library knows about React. This keeps them isolated and prevents state conflicts.**

**The key Cloudinary integration point:** The `imageURL` field in every Firestore room document is a Cloudinary `secure_url`. It is written once (on Admin upload) and read on every room load by Pannellum. Changing this value in Firestore instantly changes what the panorama viewer displays.

---

## 6. Project Setup & Installation

### Step 1 — Scaffold the project

```bash
npm create vite@latest campusxr -- --template react
cd campusxr
npm install
```

### Step 2 — Install Tailwind CSS v4

```bash
npm install tailwindcss @tailwindcss/vite
```

Update `vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

Update `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-navy: #1A365D;
  --color-academic-blue: #0047AB;
  --color-nav-green: #10B981;
  --color-amber-glow: #F59E0B;
}
```

### Step 3 — Install Firebase (Firestore + Auth only)

```bash
npm install firebase
```

Create `src/firebase.js`:

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";
// Note: getStorage is NOT imported — Cloudinary handles all file storage

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
  // storageBucket intentionally omitted
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
```

### Step 4 — Configure environment variables

Create `.env.local`:

```bash
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=campusxr_upload
```

### Step 5 — Set up Cloudinary upload preset

Follow the 5-minute setup in §4.2 above. Ensure the unsigned preset named `campusxr_upload` exists before running the Admin Panel image upload flow.

### Step 6 — Install GSAP

```bash
npm install gsap @gsap/react
```

### Step 7 — Install Three.js and Gaussian Splat Loader

```bash
npm install three @mkkellogg/gaussian-splats-3d
```

### Step 8 — Add Pannellum via CDN

Add to `index.html`:

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
</head>
<body>
  <div id="root"></div>
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

### Step 9 — Install Firebase CLI and initialise hosting

```bash
npm install -g firebase-tools
firebase login
firebase init          # Select: Firestore, Hosting, Auth (NOT Storage)
                       # Set public directory to: dist
                       # Configure as SPA: Yes
```

### Step 10 — Dev server

```bash
npm run dev            # Starts at http://localhost:5173
```

### Step 11 — Deploy

```bash
npm run build && firebase deploy
```

---

## 7. Package Reference

### Runtime Dependencies

```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^6.x",
    "firebase": "^12.0.0",
    "gsap": "^3.14.2",
    "@gsap/react": "^2.1.2",
    "three": "^0.183.2",
    "@mkkellogg/gaussian-splats-3d": "^0.x"
  }
}
```

> **v1.2 addition:** `@mkkellogg/gaussian-splats-3d` is the correct library for loading `.splat` / `.ply` Gaussian Splat scenes in Three.js. `react-router-dom ^6.x` was already present in the package.json but missing from earlier doc sections — now fully documented in §2.2.

> **v1.1 change:** No Cloudinary SDK in runtime dependencies. Cloudinary uploads use the REST Upload API directly via `fetch()` — no `cloudinary` npm package is required on the client.

### Development Dependencies

```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "vite": "^6.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x"
  }
}
```

### CDN (loaded in `index.html` — not npm)

| Library | Version | CDN URL |
|---|---|---|
| Pannellum JS | `2.5.6` | `https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js` |
| Pannellum CSS | `2.5.6` | `https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css` |

### Removed Packages (v1.1)

| What was removed | Why |
|---|---|
| `firebase/storage` module (`getStorage`, `ref`, `uploadBytes`, `getDownloadURL`) | Replaced by Cloudinary REST Upload API via `fetch()` |
| `storageBucket` in `firebaseConfig` | Firebase Storage no longer initialised |
| `firebase init Storage` CLI step | Not needed — Cloudinary handles all media storage |

---

> **Note on Firebase security rules:** For the hackathon, Firestore is initialised in test mode (open read/write). Before any public launch, replace with scoped rules that restrict writes to authenticated admin users only.

> **Note on Cloudinary security:** The unsigned upload preset (`campusxr_upload`) is intentionally public-facing — it is safe to expose in the client bundle. The `CLOUDINARY_API_SECRET` is **never** used client-side and must never be prefixed with `VITE_`.

---

*CampusXR Tech Stack Document · v1.2 · Internal — Dev Team Only · March 2026*
