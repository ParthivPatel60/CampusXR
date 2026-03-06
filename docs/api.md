# CampusXR — API Reference: How Frontend and Backend Communicate

**Version:** 1.2 | **Audience:** Dev Team (Internal) | **Hackathon Edition — February 2026**
**Changelog:**
- v1.2 — Replaced broken Three.js loader example in §6.2 with correct `@mkkellogg/gaussian-splats-3d` usage; removed duplicate `sortOrder` field from Firestore schema (§2.9); updated version header
- v1.1 — Migrated file storage from Firebase Storage to Cloudinary

> **Scope:** CampusXR has no custom REST API. The frontend communicates with three external systems directly from the browser — Firebase (Firestore, Auth), Cloudinary (REST Upload API), Pannellum (CDN), and Three.js (npm). This document is a reference sheet for every SDK call and API request made in the project: function signatures, parameters, return values, and the exact usage pattern for each.
>
> For sequence/flow diagrams showing *when* these calls happen, see [`architecture.md`](./architecture.md) §3.

---

## Table of Contents

1. [Firebase SDK — Initialisation](#1-firebase-sdk--initialisation)
2. [Firestore](#2-firestore)
3. ~~Firebase Storage~~ → Cloudinary (v1.1)
4. [Firebase Auth](#4-firebase-auth)
5. [Pannellum (CDN)](#5-pannellum-cdn)
6. [Three.js (npm)](#6-threejs-npm)

---

## 1. Firebase SDK — Initialisation

**Package:** `firebase ^12.x`
**Install:** `npm install firebase`

All Firebase services are initialised once in `src/firebase.js` and exported as singletons. Every component imports from this file — `FirebaseApp` is never instantiated more than once.

> **v1.1 change:** `getStorage` has been removed from `src/firebase.js`. Firebase Storage is no longer used. The `storage` singleton and `storageBucket` config key have been removed. All file hosting is handled by Cloudinary (see §3).

```
  src/firebase.js
  │
  ├── initializeApp(firebaseConfig)   →  app   (FirebaseApp)
  ├── getFirestore(app)               →  db    (Firestore instance)
  └── getAuth(app)                    →  auth  (Auth instance)
  │
  ✗   getStorage(app)                 →  REMOVED in v1.1 — use Cloudinary (§3)
```

```js
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAuth }       from "firebase/auth";
// NOTE: getStorage intentionally omitted — Cloudinary handles all file storage

const firebaseConfig = {
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:      import.meta.env.VITE_FIREBASE_APP_ID,
  // storageBucket: REMOVED in v1.1
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
// export const storage = getStorage(app);  ← REMOVED in v1.1
```

**`initializeApp(config)`**

| Parameter | Type   | Description                            |
|-----------|--------|----------------------------------------|
| `config`  | Object | Firebase project keys from the Console |

| Returns | Type          |
|---------|---------------|
| `app`   | `FirebaseApp` |

---

## 2. Firestore

**Module imports:**

```js
import {
  collection, doc,
  getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
```

---

### 2.1 `collection(db, ...pathSegments)`

Builds a reference to a Firestore collection. Used as input to `getDocs`, `onSnapshot`, `setDoc`.

| Parameter         | Type        | Description                                     |
|-------------------|-------------|-------------------------------------------------|
| `db`              | `Firestore` | The singleton from `src/firebase.js`            |
| `...pathSegments` | `string`    | Alternating collection / document path segments |

| Returns         | Type                  |
|-----------------|-----------------------|
| `collectionRef` | `CollectionReference` |

```js
const deptsRef = collection(db, "departments");
const roomsRef = collection(db, "departments", deptId, "rooms");
```

---

### 2.2 `doc(db, ...pathSegments)`

Builds a reference to a specific Firestore document.

| Parameter         | Type        | Description                                            |
|-------------------|-------------|--------------------------------------------------------|
| `db`              | `Firestore` | The singleton from `src/firebase.js`                   |
| `...pathSegments` | `string`    | Full path — must resolve to a document (even segments) |

| Returns  | Type                |
|----------|---------------------|
| `docRef` | `DocumentReference` |

```js
const roomRef = doc(db, "departments", deptId, "rooms", roomId);
```

---

### 2.3 `getDocs(collectionRef)`

One-time fetch of all documents in a collection. Used for initial data bootstrap.

| Parameter       | Type                  | Description         |
|-----------------|-----------------------|---------------------|
| `collectionRef` | `CollectionReference` | From `collection()` |

| Returns         | Type                    | Description                                  |
|-----------------|-------------------------|----------------------------------------------|
| `QuerySnapshot` | `Promise<QuerySnapshot>`| Resolves with all matching documents         |

```js
// Fetch all departments on page load
const snap = await getDocs(collection(db, "departments"));
const depts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

// Fetch rooms for a department
const roomSnap = await getDocs(collection(db, "departments", deptId, "rooms"));
const rooms = roomSnap.docs.map(d => ({ id: d.id, ...d.data() }));
// Each room doc includes: name, imageURL (Cloudinary secure_url), hotspots[], sortOrder

// Guided Tour: fetch rooms ordered by sortOrder (requires Firestore index if combined with other filters)
// import { query, orderBy } from "firebase/firestore";
const orderedSnap = await getDocs(
  query(collection(db, "departments", deptId, "rooms"), orderBy("sortOrder"))
);
const orderedRooms = orderedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
```

---

### 2.4 `onSnapshot(collectionRef, callback)`

Subscribes to real-time updates on a collection. Used in the Admin Dashboard for live stats.

| Parameter       | Type                      | Description                                         |
|-----------------|---------------------------|-----------------------------------------------------|
| `collectionRef` | `CollectionReference`     | From `collection()`                                 |
| `callback`      | `(QuerySnapshot) => void` | Called immediately and on every subsequent change   |

| Returns       | Type         | Description                                       |
|---------------|--------------|---------------------------------------------------|
| `unsubscribe` | `() => void` | Call in `useEffect` cleanup to stop listening     |

```js
useEffect(() => {
  const unsub = onSnapshot(collection(db, "departments"), (snap) => {
    const depts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setDepts(depts);
  });
  return () => unsub();   // cleanup on component unmount
}, []);
```

---

### 2.5 `setDoc(docRef, data)`

Creates or fully overwrites a document. Used when adding new departments or rooms.

| Parameter | Type                | Description                  |
|-----------|---------------------|------------------------------|
| `docRef`  | `DocumentReference` | From `doc()`                 |
| `data`    | `Object`            | Plain JS object to write     |

| Returns | Type            |
|---------|-----------------|
| —       | `Promise<void>` |

```js
// Add a new department
await setDoc(doc(db, "departments", newDeptId), {
  name:        "Computer Science",
  description: "Labs, lecture halls, and research spaces.",
});

// Add a new room
// imageURL is a Cloudinary secure_url — returned from uploadToCloudinary() (see §3)
await setDoc(doc(db, "departments", deptId, "rooms", newRoomId), {
  name:          "3D Printing Lab",
  imageURL:      cloudinarySecureUrl,   // Cloudinary secure_url (see §3)
  imagePublicId: cloudinaryPublicId,    // Cloudinary public_id (see §3)
  hotspots:      [],
});
```

---

### 2.6 `updateDoc(docRef, data)`

Partially updates a document — only the specified fields are changed. Used for editing names, updating `imageURL`, and appending hotspots.

| Parameter | Type                | Description                                      |
|-----------|---------------------|--------------------------------------------------|
| `docRef`  | `DocumentReference` | From `doc()`                                     |
| `data`    | `Object`            | Fields to update; supports `arrayUnion()` and `arrayRemove()` values |

| Returns | Type            |
|---------|-----------------|
| —       | `Promise<void>` |

```js
// Update a room's name
await updateDoc(doc(db, "departments", deptId, "rooms", roomId), {
  name: "Updated Lab Name",
});

// Update room image after Cloudinary upload (see §3)
await updateDoc(doc(db, "departments", deptId, "rooms", roomId), {
  imageURL:      cloudinarySecureUrl,   // Cloudinary secure_url
  imagePublicId: cloudinaryPublicId,    // Cloudinary public_id
});

// Append a new hotspot to the hotspots array
await updateDoc(doc(db, "departments", deptId, "rooms", roomId), {
  hotspots: arrayUnion({
    id:           crypto.randomUUID(),   // unique ID — generated client-side, no library needed
    pitch:        -12.5,
    yaw:           43.0,
    text:         "3D Printer — Ultimaker S5",
    type:         "info",               // "info" | "navigation"
    description:  "Available for FDM printing up to 330×240×300mm.",
    image:        cloudinarySecureUrl,  // optional — Cloudinary secure_url (info type only)
    imagePublicId: cloudinaryPublicId,  // optional — Cloudinary public_id (info type only)
    // Navigation type fields (omit for info type):
    // targetDeptId: "computer-science",  // deptId of the target room's parent department
    // targetRoomId: "3d-printing-lab",   // roomId to load
  }),
});
```

---

### 2.7 `arrayUnion(...elements)`

A Firestore field transform that appends elements to an array **without overwriting** the existing array. Always used inside `updateDoc`.

| Parameter     | Type  | Description                             |
|---------------|-------|-----------------------------------------|
| `...elements` | `any` | One or more values to append atomically |

| Returns      | Type                                              |
|--------------|---------------------------------------------------|
| `FieldValue` | Opaque Firestore transform (not a plain value)    |

```js
// Pattern — always paired with updateDoc:
updateDoc(docRef, { hotspots: arrayUnion(newHotspot) })
```

---

### 2.8 `arrayRemove(...elements)`

A Firestore field transform that removes matching elements from an array atomically. Used to **delete** a specific hotspot from the `hotspots` array.

> **Important:** Firestore arrays cannot mutate individual elements by index. Use `arrayRemove` to delete a hotspot, or replace the entire array to edit one.

| Parameter     | Type  | Description                              |
|---------------|-------|------------------------------------------|
| `...elements` | `any` | One or more values to remove atomically  |

| Returns      | Type                                           |
|--------------|------------------------------------------------|
| `FieldValue` | Opaque Firestore transform (not a plain value) |

```js
import { doc, updateDoc, arrayRemove } from "firebase/firestore";

const roomRef = doc(db, "departments", deptId, "rooms", roomId);

// DELETE a hotspot
// hotspotObject must deep-equal the stored hotspot for removal to work
await updateDoc(roomRef, {
  hotspots: arrayRemove(hotspotObject),
});

// EDIT a hotspot
// Firestore arrays cannot update individual elements by index.
// Replace the full array in a single updateDoc call.
// Match by the hotspot's unique `id` field — more reliable than pitch/yaw comparison.
const updatedHotspotArray = room.hotspots.map((hs) =>
  hs.id === original.id
    ? { ...hs, text: newText, description: newDescription }
    : hs
);
await updateDoc(roomRef, {
  hotspots: updatedHotspotArray,
});
```

> **Why not `arrayRemove` + `arrayUnion` for edit?** This two-step approach is not atomic. Replacing the full `hotspots` array in a single `updateDoc` call is the correct pattern for editing individual hotspots.

---

### 2.9 `deleteDoc(docRef)`

Deletes a single document. Used for room and department deletion.

| Parameter | Type                | Description  |
|-----------|---------------------|--------------|
| `docRef`  | `DocumentReference` | From `doc()` |

| Returns | Type            |
|---------|-----------------|
| —       | `Promise<void>` |

```js
// Delete a room
await deleteDoc(doc(db, "departments", deptId, "rooms", roomId));

// Delete a department (must also delete its rooms subcollection separately)
const roomsSnap = await getDocs(collection(db, "departments", deptId, "rooms"));
await Promise.all(roomsSnap.docs.map(d => deleteDoc(d.ref)));
await deleteDoc(doc(db, "departments", deptId));
```

> **Note:** Firestore does not auto-delete subcollections when a parent document is deleted. The room subcollection must be deleted explicitly before or after deleting the department document.

---

### 2.9 Firestore Data Shape Reference

> **v1.1 change:** `imageURL` fields now store Cloudinary `secure_url` values. `imagePublicId` fields added to store the Cloudinary `public_id` for future deletion/replacement. Firebase Storage URLs have been replaced throughout.

```
  departments  (collection)
  └── {deptId}  (document)
        ├── name          String   "Computer Science"
        ├── description   String   "Labs, lecture halls..."
        └── rooms  (subcollection)
              └── {roomId}  (document)
                    ├── name           String   "3D Printing Lab"
                    ├── imageURL       String   "https://res.cloudinary.com/..."  ← Cloudinary secure_url
                    ├── imagePublicId  String   "campusxr/rooms/roomId"           ← Cloudinary public_id
                    ├── sortOrder      Number   Integer ordering index for Guided Tour (e.g., 1, 2, 3)
                    ├── splat3DUrl     String   "https://res.cloudinary.com/..."  (optional — 3DGS scene file)
                    ├── splatPublicId  String   "campusxr/scenes/roomId"          (optional — Cloudinary public_id for 3DGS file)
                    └── hotspots       Array
                          └── {
                                id:            String   (crypto.randomUUID() — generated at save time),
                                pitch:         Number,
                                yaw:           Number,
                                text:          String,
                                type:          "info" | "navigation",
                                description:   String,
                                image:         String  (optional — Cloudinary secure_url, info type only),
                                imagePublicId: String  (optional — Cloudinary public_id, info type only),
                                targetDeptId:  String  (navigation type only — parent dept of target room),
                                targetRoomId:  String  (navigation type only — destination room)
                              }
```

---

## 3. ~~Firebase Storage~~ → Cloudinary (v1.1)

> **v1.1 change:** Firebase Storage has been fully removed and replaced with Cloudinary for all image and 3DGS scene file hosting. The `firebase/storage` module is no longer imported anywhere in the project. The `storage` singleton has been removed from `src/firebase.js`.

**No npm package required.** Uploads use the Cloudinary REST Upload API directly via the browser's native `fetch()` with `multipart/form-data` and an **unsigned upload preset**. No API secret is ever exposed to the client.

**Required environment variables (`.env.local`):**

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=campusxr_upload
```

---

### 3.1 One-time Cloudinary Dashboard Setup

Before the upload utility will work, create an unsigned upload preset in the Cloudinary dashboard (~5 minutes):

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Go to **Settings → Upload → Upload Presets → Add upload preset**.
3. Set **Signing mode** to `Unsigned`.
4. Set preset name to `campusxr_upload`.
5. Set default folder to `campusxr`.
6. **Allowed formats** — Set the allowed formats to include `splat` and `ply` (alongside standard image formats), or set to **Any format** to permit all file types including 3DGS scene files.
7. Save.

> ⚠️ **Required for 3DGS uploads:** Cloudinary upload presets default to image-only acceptance. Without allowing `splat` and `ply` formats (or **Any format**), scene file uploads to the `/raw/upload` endpoint will be rejected by the preset.

---

### 3.2 `uploadToCloudinary(file, folder)` — 360° Images

Uploads a panorama image to Cloudinary. Returns `{ url, publicId }` — both must be written to Firestore.

> **Replaces:** `ref()` + `uploadBytes()` + `getDownloadURL()` from `firebase/storage`

| Parameter | Type     | Default             | Description                               |
|-----------|----------|---------------------|-------------------------------------------|
| `file`    | `File`   | —                   | File object from `<input type="file">`    |
| `folder`  | `string` | `"campusxr/rooms"`  | Cloudinary folder path for the asset      |

| Returns     | Type                              | Description                                              |
|-------------|-----------------------------------|----------------------------------------------------------|
| `url`       | `Promise<{ url, publicId }>`      | `url` = `secure_url`; `publicId` = `public_id`           |

```js
// src/utils/uploadToCloudinary.js

export async function uploadToCloudinary(file, folder = "campusxr/rooms") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Cloudinary upload failed");
  }

  const data = await res.json();
  return {
    url:      data.secure_url,   // → write to Firestore as imageURL
    publicId: data.public_id,    // → write to Firestore as imagePublicId
  };
}
```

---

### 3.3 `uploadSceneToCloudinary(file, folder)` — 3DGS Scene Files

Uploads a `.splat` or `.ply` Gaussian Splat scene file to Cloudinary using the `raw` resource type. Returns `{ url, publicId }`.

> **Note:** 3DGS scene files must use the `/raw/upload` endpoint, not `/image/upload`.

| Parameter | Type     | Default              | Description                              |
|-----------|----------|----------------------|------------------------------------------|
| `file`    | `File`   | —                    | `.splat` or `.ply` scene file            |
| `folder`  | `string` | `"campusxr/scenes"`  | Cloudinary folder path for the asset     |

| Returns    | Type                         | Description                                       |
|------------|------------------------------|---------------------------------------------------|
| —          | `Promise<{ url, publicId }>` | `url` = `secure_url`; `publicId` = `public_id`   |

```js
// src/utils/uploadToCloudinary.js

export async function uploadSceneToCloudinary(file, folder = "campusxr/scenes") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Cloudinary scene upload failed");
  }

  const data = await res.json();
  return {
    url:      data.secure_url,   // → write to Firestore as splat3DUrl
    publicId: data.public_id,    // → write to Firestore as splatPublicId
  };
}
```

---

### 3.4 Cloudinary Upload Response Shape

Both upload functions return a JSON response from Cloudinary. The fields used by CampusXR:

| Response Field | Type     | Description                                               | Stored In Firestore As |
|----------------|----------|-----------------------------------------------------------|------------------------|
| `secure_url`   | `string` | HTTPS CDN URL for the uploaded asset                      | `imageURL` / `splat3DUrl` / `hotspot.image` |
| `public_id`    | `string` | Cloudinary's unique asset identifier                      | `imagePublicId` / `splatPublicId` / `hotspot.imagePublicId` |
| `resource_type`| `string` | `"image"` for panoramas; `"raw"` for scene files          | Not stored             |
| `format`       | `string` | File format detected by Cloudinary (`"jpg"`, `"splat"`)   | Not stored             |

---

### 3.5 Full Upload + Write Pattern (Admin Panel)

```js
// RoomManager.jsx — full image upload flow (replaces Firebase Storage pattern)
import { uploadToCloudinary }       from "../utils/uploadToCloudinary";
import { doc, updateDoc }           from "firebase/firestore";
import { db }                       from "../firebase";

async function handleRoomImageUpload(deptId, roomId, file) {
  // 1. Upload to Cloudinary — single fetch call, returns URL immediately
  //    (replaces: uploadBytes() + getDownloadURL() — two separate calls)
  const { url, publicId } = await uploadToCloudinary(file, "campusxr/rooms");

  // 2. Write secure_url + public_id to Firestore
  await updateDoc(doc(db, "departments", deptId, "rooms", roomId), {
    imageURL:      url,       // Cloudinary secure_url — consumed directly by Pannellum
    imagePublicId: publicId,  // stored for future deletion or replacement
  });

  return url;
}
```

---

### 3.6 Migration Reference — Firebase Storage → Cloudinary

| Firebase Storage (removed)                                             | Cloudinary equivalent (v1.1)                                    |
|------------------------------------------------------------------------|-----------------------------------------------------------------|
| `import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"` | No import — uses `fetch()` natively              |
| `const storage = getStorage(app)`                                      | Removed from `src/firebase.js`                                  |
| `const storageRef = ref(storage, "panoramas/room.jpg")`               | `folder` param in `FormData` (`"campusxr/rooms"`)               |
| `await uploadBytes(storageRef, file)`                                  | `await fetch(...cloudinary.../image/upload, { body: formData })` |
| `const url = await getDownloadURL(storageRef)`                        | `data.secure_url` from response JSON (single call)              |
| `storageBucket` in `firebaseConfig`                                    | Removed — not needed                                            |
| `VITE_FIREBASE_STORAGE_BUCKET` env var                                 | Removed — replaced by `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET` |

---

### 3.7 Cloudinary Storage Path Conventions

```
  Cloudinary account (cloud name: your_cloud_name)
  │
  └── campusxr/  (root folder — set in upload preset)
        │
        ├── rooms/
        │     └── {roomId or filename}     360° equirectangular images (resource_type: image)
        │
        ├── scenes/
        │     └── {roomId or filename}     Gaussian Splat scene files (resource_type: raw)
        │
        └── hotspots/
              └── {hotspotId or filename}  Optional hotspot info images (resource_type: image)
```

---

## 4. Firebase Auth

**Module imports:**

```js
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
```

> **v1.1 note:** Firebase Auth is unchanged. It continues to protect the `/admin` route. Only Firestore and Auth remain in the Firebase SDK — Storage has been removed.

---

### 4.1 `signInWithEmailAndPassword(auth, email, password)`

Authenticates an admin with email and password credentials.

| Parameter  | Type     | Description                          |
|------------|----------|--------------------------------------|
| `auth`     | `Auth`   | The singleton from `src/firebase.js` |
| `email`    | `string` | Admin email address                  |
| `password` | `string` | Admin password                       |

| Returns          | Type                      | Description                       |
|------------------|---------------------------|-----------------------------------|
| `UserCredential` | `Promise<UserCredential>` | Contains `user` object on success |
| —                | `throws AuthError`        | On wrong credentials or network error |

```js
// LoginPage.jsx
try {
  await signInWithEmailAndPassword(auth, email, password);
  // onAuthStateChanged fires automatically — AdminRoute will re-render
} catch (err) {
  // err.code: "auth/user-not-found" | "auth/wrong-password" | "auth/network-request-failed"
  setError(err.message);
}
```

---

### 4.2 `onAuthStateChanged(auth, callback)`

Subscribes to the user's sign-in state. Fires immediately with the current user (or `null`), then again on every change. Used in `AdminRoute.jsx` to gate access to `/admin`.

| Parameter  | Type                     | Description                                                |
|------------|--------------------------|------------------------------------------------------------|
| `auth`     | `Auth`                   | The singleton from `src/firebase.js`                       |
| `callback` | `(User \| null) => void` | Called with `User` when signed in, `null` when signed out  |

| Returns       | Type         | Description                                   |
|---------------|--------------|-----------------------------------------------|
| `unsubscribe` | `() => void` | Call in `useEffect` cleanup to stop listening |

```js
// AdminRoute.jsx
import { useState, useEffect } from "react";
import { onAuthStateChanged }  from "firebase/auth";
import { Navigate }            from "react-router-dom";
import { auth }                from "./firebase";

export default function AdminRoute({ children }) {
  const [user, setUser] = useState(undefined);   // undefined = still loading

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);     // auto-cleanup on unmount
  }, []);

  if (user === undefined) return <p>Loading...</p>;
  return user ? children : <Navigate to="/login" />;
}
```

**`user` value states:**

| Value       | Meaning                                           |
|-------------|---------------------------------------------------|
| `undefined` | `onAuthStateChanged` has not fired yet (loading)  |
| `null`      | No signed-in user → redirect to `/login`          |
| `User`      | Authenticated → render admin content              |

---

### 4.3 `signOut(auth)`

Signs the current user out and clears the persisted session.

| Parameter | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `auth`    | `Auth` | The singleton from `src/firebase.js` |

| Returns | Type            |
|---------|-----------------|
| —       | `Promise<void>` |

```js
// Logout button handler
await signOut(auth);
// onAuthStateChanged fires with null → AdminRoute redirects to /login
```

---

### 4.4 Common Auth Error Codes

| `err.code`                    | Cause                                            |
|-------------------------------|--------------------------------------------------|
| `auth/user-not-found`         | No account with that email                       |
| `auth/wrong-password`         | Incorrect password                               |
| `auth/invalid-email`          | Malformed email string                           |
| `auth/too-many-requests`      | Account temporarily locked after failed attempts |
| `auth/network-request-failed` | No internet / Firebase unreachable               |

---

## 5. Pannellum (CDN)

**Loaded via:** `index.html` CDN tags (not an npm package — does not appear in `package.json`)
**Version:** `2.5.6`

```html
<!-- index.html -->
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
</head>
<body>
  <div id="root"></div>
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
  <script type="module" src="/src/main.jsx"></script>
</body>
```

Pannellum attaches itself to the global `window.pannellum` object. Inside React, it is accessed via the global `pannellum` identifier (no import needed).

---

### 5.1 `pannellum.viewer(container, config)`

Mounts a 360° panorama viewer into a DOM element. Returns a viewer instance.

| Parameter   | Type          | Description                                                       |
|-------------|---------------|-------------------------------------------------------------------|
| `container` | `HTMLElement` | The DOM node to render into — passed as `viewerRef.current`       |
| `config`    | `Object`      | Viewer configuration (see §5.2)                                   |

| Returns          | Type              | Description                                          |
|------------------|-------------------|------------------------------------------------------|
| `viewerInstance` | `PannellumViewer` | The viewer object; holds `.destroy()` and `.getConfig()` |

```js
// PanoramaViewer.jsx
import { useEffect, useRef } from "react";

export default function PanoramaViewer({ imageURL, hotspots, onHotspotClick }) {
  const viewerRef   = useRef(null);   // host <div>
  const instanceRef = useRef(null);   // Pannellum viewer instance

  useEffect(() => {
    if (!viewerRef.current || !imageURL) return;

    // imageURL is a Cloudinary secure_url — passed directly to Pannellum as a plain HTTPS string
    instanceRef.current = pannellum.viewer(viewerRef.current, {
      type:         "equirectangular",
      panorama:     imageURL,           // Cloudinary secure_url from Firestore
      hotSpots:     hotspots,
      autoLoad:     true,
      showControls: false,
    });

    return () => instanceRef.current?.destroy();
  }, [imageURL, hotspots]);  // Re-mount when room changes OR hotspots array updates

  return <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />;
}
```

---

### 5.2 Config Object

| Field          | Type      | Default | Description                                                                      |
|----------------|-----------|---------|----------------------------------------------------------------------------------|
| `type`         | `string`  | —       | Always `"equirectangular"` for standard 360° images                              |
| `panorama`     | `string`  | —       | URL of the equirectangular image — **Cloudinary `secure_url`** (from Firestore)  |
| `hotSpots`     | `Array`   | `[]`    | Array of hotspot objects (see §5.3)                                              |
| `autoLoad`     | `boolean` | `false` | Set `true` to load image immediately without user click                          |
| `showControls` | `boolean` | `true`  | Show/hide the default Pannellum UI controls                                      |
| `pitch`        | `number`  | `0`     | Initial vertical look angle (degrees)                                            |
| `yaw`          | `number`  | `0`     | Initial horizontal look angle (degrees)                                          |
| `hfov`         | `number`  | `100`   | Horizontal field of view (degrees)                                               |

> **v1.1 note:** The `panorama` field now always contains a Cloudinary `secure_url`. Pannellum treats it as a plain HTTPS image URL — no configuration change is required.

---

### 5.3 Hotspot Object Shape

Each object in the `hotSpots` array maps directly to the Firestore `hotspots[]` field.

| Field               | Type       | Description                                                                         |
|---------------------|------------|-------------------------------------------------------------------------------------|
| `pitch`             | `number`   | Vertical angle of hotspot placement (from Firestore)                                |
| `yaw`               | `number`   | Horizontal angle of hotspot placement (from Firestore)                              |
| `text`              | `string`   | Tooltip label shown on hover                                                        |
| `type`              | `string`   | `"info"` or `"custom"` — use `"custom"` for navigation hotspots in Pannellum       |
| `cssClass`          | `string`   | Custom CSS class for styling (`"info-hotspot"` / `"nav-hotspot"`)                   |
| `clickHandlerFunc`  | `function` | Called when hotspot is clicked — opens `InfoSidePanel` or triggers room navigation  |
| `clickHandlerArgs`  | `any`      | Argument passed to `clickHandlerFunc` — pass the full hotspot object from Firestore |

```js
// Building hotSpots array from Firestore data before passing to Pannellum
// hotspot.image (if set) is a Cloudinary secure_url — passed through to InfoSidePanel
const hotSpots = room.hotspots.map(hs => ({
  pitch:            hs.pitch,
  yaw:              hs.yaw,
  text:             hs.text,
  type:             "custom",
  cssClass:         hs.type === "info" ? "info-hotspot" : "nav-hotspot",
  clickHandlerFunc: handleHotspotClick,
  clickHandlerArgs: hs,    // full Firestore hotspot object — includes hs.image (Cloudinary URL)
}));
```

---

### 5.4 Viewer Instance Methods

| Method                           | Signature                                    | Description                                              |
|----------------------------------|----------------------------------------------|----------------------------------------------------------|
| `destroy()`                      | `() => void`                                 | Unmounts the viewer and frees all resources. Always call in `useEffect` cleanup. |
| `getConfig()`                    | `() => Object`                               | Returns the current viewer config object                 |
| `getPitch()`                     | `() => number`                               | Returns current vertical look angle **at the camera center**  |
| `getYaw()`                       | `() => number`                               | Returns current horizontal look angle **at the camera center** |
| `lookAt(p, y, hfov, speed)`      | `(number, number, number, number) => void`   | Programmatically pan/zoom the viewer                     |
| `mouseEventToCoords(event)`      | `(MouseEvent) => [number, number]`           | Returns `[pitch, yaw]` at the exact pixel the user clicked — **use this for hotspot placement** (see §5.5) |

```js
// CAMERA CENTER ORIENTATION ONLY — do NOT use these for hotspot placement.
// getPitch() and getYaw() return the look angle at the centre of the camera view,
// NOT the position the user clicked. Using them for hotspot placement produces
// inaccurate coordinates whenever the admin's click is away from screen centre.
//
// ✅ For hotspot placement use mouseEventToCoords(event) — see §5.5 below.
const pitch = instanceRef.current.getPitch(); // camera centre pitch
const yaw   = instanceRef.current.getYaw();   // camera centre yaw
```

---

### 5.5 Click-to-Coordinate Capture (Hotspot Placement)

Used in `HotspotEditor.jsx` when the admin clicks the panorama to place a new hotspot. `mouseEventToCoords(event)` returns the exact `[pitch, yaw]` for the pixel the user clicked — not the center of the camera view. This is why `getPitch()` / `getYaw()` are **not** used here (see §5.4 for what those methods return).

```js
// HotspotEditor.jsx — admin click-to-place hotspot flow

viewer.on("mouseup", function (event) {
  const [pitch, yaw] = viewer.mouseEventToCoords(event);
  // pitch and yaw now reflect the exact click location in the panorama,
  // not the current camera center.

  // Pass captured coordinates into the editor popup form state
  setHotspotDraft(prev => ({
    ...prev,
    pitch,
    yaw,
  }));

  setIsEditorPopupOpen(true);
});
```

> **Why `mouseup` and not `mousedown`?**
> Using `mousedown` fires before the user completes a drag, which causes false placements when the admin is simply panning the panorama. `mouseup` fires only when the pointer is released, correctly distinguishing a deliberate click from a pan gesture.

> **Why `mouseEventToCoords` and not `getPitch()` / `getYaw()`?**
> `getPitch()` and `getYaw()` return the coordinates at the **center of the current camera view**, not the position the user clicked. For hotspot placement, the click position must be exact — `mouseEventToCoords(event)` maps the raw mouse event to the correct spherical coordinates in the panorama.

---

## 6. Three.js (npm)

**Package:** `three ^0.183.2`
**Install:** `npm install three`

```js
import * as THREE from "three";
```

Three.js is used **only** in `ThreeDGSViewer.jsx`, which is conditionally mounted when `is3DGSMode === true`. It renders the Gaussian Splat (3DGS) scene into a `<canvas>` ref. The scene file is fetched directly from its **Cloudinary `secure_url`** — Three.js treats it as a plain HTTPS URL with no special handling required.

---

### 6.1 `new THREE.WebGLRenderer({ canvas })`

Creates the WebGL rendering context attached to a specific canvas element.

| Option      | Type                | Description                                            |
|-------------|---------------------|--------------------------------------------------------|
| `canvas`    | `HTMLCanvasElement` | The canvas DOM node — passed as `canvasRef.current`    |
| `antialias` | `boolean`           | Optional — `true` for smoother edges                   |

| Returns    | Type            |
|------------|-----------------|
| `renderer` | `WebGLRenderer` |

```js
const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
```

---

### 6.2 Scene, Camera, and Animation Loop

```js
// ThreeDGSViewer.jsx
import { useEffect, useRef } from "react";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

export default function ThreeDGSViewer({ sceneURL }) {
  // sceneURL = Cloudinary secure_url for the .splat scene file (from Firestore splat3DUrl)
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !sceneURL) return;

    // Use @mkkellogg/gaussian-splats-3d Viewer — handles scene loading,
    // orbit controls, and the internal render loop.
    // WRONG: GaussianSplatLoader does not exist. Do NOT use new THREE.WebGLRenderer() directly
    // for 3DGS scenes — the GaussianSplats3D.Viewer manages the renderer internally.
    const viewer = new GaussianSplats3D.Viewer({
      rootElement: containerRef.current,
    });

    // sceneURL is a plain HTTPS Cloudinary secure_url — fetched with no special auth
    viewer
      .addSplatScene(sceneURL)
      .then(() => {
        viewer.start(); // starts the internal render loop
      });

    // Cleanup — runs when is3DGSMode flips false OR component unmounts
    return () => {
      viewer.stop();
      viewer.dispose();
    };
  }, [sceneURL]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

---

### 6.3 Key Three.js API Surface Used

| Class / Function                                    | Purpose in CampusXR                                                        |
|-----------------------------------------------------|----------------------------------------------------------------------------|
| `new THREE.WebGLRenderer({ canvas })`               | Initialise WebGL context on the canvas ref                                 |
| `renderer.setSize(w, h)`                            | Match canvas to viewport dimensions                                        |
| `renderer.setPixelRatio(ratio)`                     | Handle HiDPI / Retina screens                                              |
| `renderer.render(scene, camera)`                    | Render one frame — called on every `requestAnimationFrame` tick            |
| `renderer.dispose()`                                | Release all GPU resources — **always call in `useEffect` cleanup**         |
| `new THREE.Scene()`                                 | The container for all 3D objects                                           |
| `new THREE.PerspectiveCamera(fov, aspect, near, far)` | Camera through which the scene is viewed                                 |
| `camera.position.set(x, y, z)`                      | Set initial camera position in 3D space                                    |
| `requestAnimationFrame(animate)`                    | Drive the render loop — returns ID for cleanup                             |
| `cancelAnimationFrame(id)`                          | Stop the render loop on cleanup                                            |

---

### 6.4 `renderer.dispose()`

Releases all WebGL resources (buffers, textures, programs) held by the renderer. Must be called in the `useEffect` cleanup to prevent GPU memory leaks when `ThreeDGSViewer` unmounts.

| Parameter | Type | Description   |
|-----------|------|---------------|
| —         | —    | No parameters |

| Returns | Type   |
|---------|--------|
| —       | `void` |

```js
// useEffect cleanup — runs when is3DGSMode flips false
return () => {
  cancelAnimationFrame(animFrameId);
  renderer.dispose();
  // Optionally dispose individual geometries and materials:
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
};
```

---

*CampusXR API Reference · v1.2 · Internal — Dev Team Only · March 2026*
