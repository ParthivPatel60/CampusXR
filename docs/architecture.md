# CampusXR — Architecture: How Systems Connect

**Version:** 1.2 | **Audience:** Dev Team (Internal) | **Hackathon Edition — February 2026**
**Changelog:**
- v1.2 — Added `@mkkellogg/gaussian-splats-3d` loader reference; added react-router-dom routing structure; corrected Pannellum visibility behavior (CSS hidden, not suspended); added Known Limitations section
- v1.1 — Migrated file storage from Firebase Storage to Cloudinary

---

## Table of Contents

1. [System Topology](#1-system-topology)
2. [React Component Tree](#2-react-component-tree)
3. [Data Flow](#3-data-flow)
4. [Rendering Pipeline](#4-rendering-pipeline)
5. [Authentication Flow](#5-authentication-flow)
6. [React State Model](#6-react-state-model)

---

## 1. System Topology

The full system spans three layers: the browser (React app), the Firebase platform (Firestore, Auth, Hosting), and Cloudinary (media storage and CDN). The React app is served as a static bundle from Firebase Hosting. It communicates with Firestore and Auth through the Firebase JS SDK, and uploads media directly to Cloudinary via its REST Upload API — no custom backend server exists.

```
┌────────────────────────────── BROWSER ────────────────────────────────────┐
│                                                                             │
│   React App  (Vite build, served from Firebase Hosting)                     │
│                                                                             │
│  ┌───────────────────────────────┐   ┌───────────────────────────────────┐ │
│  │        User Tour Page          │   │           Admin Panel             │ │
│  │         (public, /)            │   │      (protected, /admin)          │ │
│  │                               │   │                                   │ │
│  │  PanoramaViewer.jsx            │   │  AdminRoute.jsx  (auth guard)     │ │
│  │  ThreeDGSViewer.jsx            │   │  AdminDashboard.jsx               │ │
│  │  BottomNavBar.jsx              │   │  DeptManager.jsx                  │ │
│  │  InfoSidePanel.jsx             │   │  RoomManager.jsx                  │ │
│  │  DeptFilterDropdown.jsx        │   │  HotspotEditor.jsx                │ │
│  │  LiveSearchBar.jsx             │   │                                   │ │
│  └──────────────┬────────────────┘   └──────────────┬────────────────────┘ │
│                 │                                    │                       │
│                 └──────────────┬─────────────────────┘                      │
│                                │  Firebase JS SDK (firebase ^12.x)           │
│                                │  Cloudinary REST API (fetch — no SDK)       │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼────────────────────────────────────────────┐
         │              FIREBASE PLATFORM                                       │
         │                       │                                              │
         │  ┌────────────────────▼───────────────────────────┐                │
         │  │  Firebase Hosting                               │                │
         │  │  Serves the React + Vite production bundle      │                │
         │  └────────────────────────────────────────────────┘                │
         │                                                                      │
         │  ┌────────────────────────────────────────────────┐                │
         │  │  Firebase Firestore                             │                │
         │  │  Stores: departments, rooms, hotspot arrays     │                │
         │  │  imageURL fields point to Cloudinary secure_url │                │
         │  └────────────────────────────────────────────────┘                │
         │                                                                      │
         │  ┌────────────────────────────────────────────────┐                │
         │  │  Firebase Auth  (Email / Password)              │                │
         │  │  Issues session tokens for admin accounts       │                │
         │  └────────────────────────────────────────────────┘                │
         │                                                                      │
         │  ✗  Firebase Storage — REMOVED in v1.1                              │
         │     Replaced by Cloudinary (see below)                               │
         └──────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────────────────────────────────────┐
         │              CLOUDINARY PLATFORM  (replaces Firebase Storage)         │
         │                                                                        │
         │  ┌──────────────────────────────────────────────────────────────┐    │
         │  │  Cloudinary Media Storage + CDN                               │    │
         │  │  Stores: 360° panorama images, hotspot images, 3DGS scene     │    │
         │  │  files (.splat / .ply)                                        │    │
         │  │  Delivers: HTTPS secure_url consumed directly by Pannellum    │    │
         │  │  and Three.js                                                 │    │
         │  │  Upload: Admin Panel → fetch POST to REST Upload API          │    │
         │  │  (unsigned preset — no SDK, no secret exposed to browser)     │    │
         │  └──────────────────────────────────────────────────────────────┘    │
         └──────────────────────────────────────────────────────────────────────┘
```

---

## 2. React Component Tree

Components are split across two routes. Imperative libraries (Pannellum, Three.js) are mounted inside `useRef` + `useEffect` — they never appear in the JSX tree; only their host DOM nodes do.

```
App.jsx  (wrapped in <BrowserRouter> — see react-router-dom setup in Tech_Stack.md §2.2)
│
├── <Routes>
│   │
│   ├──  /  →  <UserTourPage>
│   │    │
│   │    ├── <BottomNavBar ref={navRef}>
│   │    │     GSAP slide-up on mount (useGSAP)
│   │    │     Reads: activeDept, activeRoom (from parent state)
│   │    │     Writes: calls setActiveDept(), setActiveRoom() on click
│   │    │
│   │    ├── <PanoramaViewer imageURL={activeRoom.imageURL} hotspots={activeRoom.hotspots}>
│   │    │     imageURL = Cloudinary secure_url stored in Firestore
│   │    │     Pannellum mounted imperatively into <div ref={viewerRef}>
│   │    │     useEffect re-runs on imageURL OR hotspots change → destroy + remount
│   │    │
│   │    ├── {isSidePanelOpen && <InfoSidePanel ref={panelRef} hotspot={activeHotspot}>}
│   │    │     GSAP slide-in on mount (useGSAP)
│   │    │     Reads: activeHotspot data (image = Cloudinary secure_url if set)
│   │    │     Writes: calls setIsSidePanelOpen(false) on close
│   │    │
│   │    ├── {is3DGSMode && <ThreeDGSViewer sceneURL={activeRoom.splat3DUrl}>}
│   │    │     sceneURL = Cloudinary secure_url for .splat scene file
│   │    │     Three.js WebGLRenderer mounted into <canvas ref={canvasRef}>
│   │    │     Unmounts → renderer.dispose() runs automatically
│   │    │
│   │    ├── <DeptFilterDropdown>          (Build If Time — client-side only)
│   │    └── <LiveSearchBar>              (Build If Time — client-side only)
│   │
│   └──  /admin  →  <AdminRoute>         (Firebase Auth guard — see §5)
│        │
│        ├── [unauthenticated] → <LoginPage>
│        │     Firebase Auth: signInWithEmailAndPassword()
│        │
│        └── [authenticated]  → <AdminPanel>
│              │
│              ├── <AdminDashboard>
│              │     Reads Firestore: dept count, room count, recent updates
│              │     Uses onSnapshot() for live updates
│              │
│              ├── <DeptManager>
│              │     Reads / writes Firestore: departments collection
│              │
│              ├── <RoomManager>
│              │     Uploads image → Cloudinary REST API (fetch POST)
│              │     Receives { secure_url, public_id } from Cloudinary response
│              │     Writes Firestore: sets roomId/imageURL (secure_url)
│              │                       sets roomId/imagePublicId (public_id)
│              │     NOTE: Firebase Storage uploadBytes() removed in v1.1
│              │
│              └── <HotspotEditor>
│                    Pannellum viewer (same as public tour, in editor mode)
│                    Panorama image loaded from Cloudinary secure_url
│                    Click → auto-capture pitch + yaw
│                    Optional hotspot image → Cloudinary REST API upload
│                    Writes Firestore: updateDoc hotspots array on the room
│                    Hotspot image field = Cloudinary secure_url
```

---

## 3. Data Flow

### 3.1 Read/Write Map (summary)

```
  Component                       Reads From                        Writes To
  ────────────────────────────────────────────────────────────────────────────────
  PanoramaViewer.jsx              Firestore (rooms, hotspots)       —
                                  Cloudinary CDN (imageURL
                                  = secure_url from Firestore)

  ThreeDGSViewer.jsx              Cloudinary CDN (splat3DUrl        —
                                  = secure_url from Firestore)

  BottomNavBar.jsx                React state (activeDept,          React state
                                  activeRoom)

  InfoSidePanel.jsx               React state (activeHotspot)       React state
                                  Cloudinary CDN (hotspot.image
                                  = secure_url, if set)

  AdminDashboard.jsx              Firestore (via onSnapshot)        —

  DeptManager.jsx                 Firestore (departments)           Firestore

  RoomManager.jsx                 Firestore (rooms)                 Cloudinary (image upload)
                                                                    Firestore (imageURL,
                                                                    imagePublicId)

  HotspotEditor.jsx               Firestore (room + hotspots)       Cloudinary (hotspot image
                                  Cloudinary CDN (panorama URL)     upload, if provided)
                                                                    Firestore (hotspots[])

  AdminRoute.jsx                  Firebase Auth (session)           —

  LoginPage.jsx                   —                                 Firebase Auth (sign-in)
```

### 3.2 User Tour Page — Page Load Sequence

```
  React (browser)               Firestore                    Cloudinary CDN
      │                             │                               │
      │  getDocs(departments)        │                               │
      │─────────────────────────────►│                               │
      │◄─────────────────────────────│  [dept documents]             │
      │                             │                               │
      │  getDocs(rooms for dept[0])  │                               │
      │─────────────────────────────►│                               │
      │◄─────────────────────────────│  [room docs with hotspots[]]  │
      │                             │  imageURL = Cloudinary        │
      │                             │  secure_url                   │
      │                             │                               │
      │  room[0].imageURL (Cloudinary secure_url) ─────────────────►│
      │◄────────────────────────────────────────────────────────────  360° image
      │                             │                               │
  Pannellum.viewer() called on viewerRef.current
  panorama: imageURL (Cloudinary secure_url) passed to Pannellum config
  hotspots[] from Firestore injected into Pannellum config
  BottomNavBar GSAP slide-up fires
```

### 3.3 Room Navigation (nav bar click or navigation hotspot click)

```
  React (browser)               Firestore (cache)            Cloudinary CDN
      │                             │                               │
      │  setActiveRoom(room)         │                               │
      │  [nav bar click: uses existing activeDept]                   │
      │                             │                               │
      │  [navigation hotspot click: uses hotspot.targetDeptId        │
      │   + hotspot.targetRoomId to resolve cross-dept path]         │
      │  const roomRef = doc(db,                                     │
      │    "departments", hotspot.targetDeptId,                      │
      │    "rooms",       hotspot.targetRoomId)                      │
      │  [check local JS cache]      │                               │
      │  if cache miss:              │                               │
      │  getDoc(roomRef) ───────────►│                               │
      │◄─────────────────────────────│  [room doc]                   │
      │                             │  imageURL = Cloudinary        │
      │                             │  secure_url                   │
      │                             │                               │
      │  new imageURL (Cloudinary secure_url) ─────────────────────►│
      │◄────────────────────────────────────────────────────────────  360° image
      │                             │                               │
  PanoramaViewer useEffect re-runs on imageURL change
  → instanceRef.current.destroy()   (previous viewer cleaned up)
  → pannellum.viewer() called fresh with new Cloudinary imageURL
  → new hotspots[] injected
  BottomNavBar breadcrumb updates to hotspot.targetDeptId + loaded room
```

### 3.4 3DGS Mode Activation

```
  React (browser)                                    Cloudinary CDN
      │                                                    │
      │  setIs3DGSMode(true)                               │
      │  → {is3DGSMode && <ThreeDGSViewer>} mounts         │
      │                                                    │
      │  activeRoom.splat3DUrl (Cloudinary secure_url) ───►│
      │◄──────────────────────────────────────────────────  .splat scene file
      │                                                    │
  Three.js WebGLRenderer initialised on canvasRef.current
  GaussianSplats3D.Viewer loads scene from Cloudinary secure_url (addSplatScene)
  viewer.start() launches the internal render loop
  PanoramaViewer remains mounted in the DOM but is hidden via CSS
  (display:none or z-index layering — it is NOT destroyed or suspended)

      │  setIs3DGSMode(false)
      │  → <ThreeDGSViewer> unmounts
      │  → useEffect cleanup: viewer.stop() + viewer.dispose()  (memory freed)
      │  PanoramaViewer CSS visibility restored — viewer resumes in existing viewerRef.current div
```

### 3.5 Admin Content Write — Room + Image

> **v1.1 change:** Firebase Storage `uploadBytes()` + `getDownloadURL()` replaced by a single Cloudinary REST Upload API call via `fetch()`. The returned `secure_url` is written to Firestore as `imageURL`; `public_id` is written as `imagePublicId`.

```
  Admin (browser)        Cloudinary REST API              Firestore
      │                         │                              │
      │  file input              │                              │
      │                          │                              │
      │  fetch POST (multipart/form-data)                       │
      │  upload_preset: campusxr_upload                         │
      │  folder: campusxr/rooms                                 │
      │─────────────────────────►│                              │
      │◄─────────────────────────│  { secure_url, public_id }   │
      │                          │                              │
      │  setDoc / updateDoc({                                   │
      │    imageURL:      secure_url,                           │
      │    imagePublicId: public_id                             │
      │  })                                                     │
      │─────────────────────────────────────────────────────────►│
      │◄─────────────────────────────────────────────────────────│  write confirmed
      │                         │                              │
  User Tour Page immediately picks up new imageURL
  (Cloudinary secure_url) via Firestore onSnapshot listener
  or next room load — Pannellum consumes it as a plain HTTPS URL
```

### 3.6 Admin Content Write — Hotspot (Click-to-Place)

```
  HotspotEditor (browser)          Cloudinary (optional)        Firestore
      │                                    │                          │
      │  Admin clicks on Pannellum panorama│                          │
      │  (panorama loaded from Cloudinary  │                          │
      │   secure_url — no change here)     │                          │
      │  Pannellum click event fires →     │                          │
      │  { pitch, yaw } auto-captured      │                          │
      │                                    │                          │
      │  Admin fills popup:                │                          │
      │  label, type, description          │                          │
      │  [optional image upload]           │                          │
      │  ─────────────────────────────────►│                          │
      │  fetch POST to Cloudinary          │                          │
      │◄─────────────────────────────────── { secure_url, public_id } │
      │                                    │                          │
      │  updateDoc(roomRef, {                                         │
      │    hotspots: arrayUnion({                                     │
      │      id: crypto.randomUUID(),                                 │
      │      pitch, yaw, text, type,                                  │
      │      description, [targetRoomId],                             │
      │      [image: secure_url],                                     │
      │      [imagePublicId: public_id]                               │
      │      // navigation type only:                                 │
      │      [targetDeptId: "engineering"],                           │
      │      [targetRoomId: "workshop-101"]                           │
      │    })                                                         │
      │  })                                                           │
      │───────────────────────────────────────────────────────────────►│
      │◄───────────────────────────────────────────────────────────────│  write confirmed
      │                                                               │
  Hotspot immediately live on public tour
  (no page reload required — Firestore listener propagates change)
  Optional hotspot image served from Cloudinary CDN secure_url
```

---

## 4. Rendering Pipeline

Pannellum and Three.js are **imperative** libraries. They take ownership of raw DOM nodes (a `<div>` and a `<canvas>` respectively). React manages *when* those nodes are created and destroyed — the libraries themselves have no knowledge of React's component model. All media URLs (panorama images, 3DGS scene files) are Cloudinary `secure_url` strings — both libraries consume them as plain HTTPS URLs with no special handling required.

### 4.1 Pannellum in React

```
  <PanoramaViewer imageURL={...} hotspots={[...]}>

    render()
    └── <div ref={viewerRef} style={{ width:"100%", height:"100%" }} />
          ▲
          │  Pannellum takes full ownership of this DOM node

    useEffect([imageURL, hotspots]) {
    //         ^^^^^^^^  ^^^^^^^^
    //         Re-runs when room changes (new imageURL)
    //         OR when hotspot array is updated by Admin Panel write

      // Mount
      instanceRef.current = pannellum.viewer(viewerRef.current, {
        type:      "equirectangular",
        panorama:  imageURL,          ← Cloudinary secure_url (from Firestore)
        hotSpots:  hotspots,          ← from Firestore room doc
        autoLoad:  true,
      })

      // Cleanup (runs on imageURL OR hotspots change OR component unmount)
      return () => instanceRef.current?.destroy()
    }
```

### 4.2 Three.js in React

```
  {is3DGSMode && <ThreeDGSViewer sceneURL={activeRoom.splat3DUrl}>}

    render()
    └── <canvas ref={canvasRef} />
          ▲
          │  Three.js WebGLRenderer takes full ownership of this canvas

    useEffect([sceneURL]) {

      // Mount using @mkkellogg/gaussian-splats-3d
      // import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
      const viewer = new GaussianSplats3D.Viewer({ rootElement: containerRef.current })
      viewer.addSplatScene(sceneURL)  // sceneURL = Cloudinary secure_url for .splat/.ply file
        .then(() => viewer.start())    // Starts the internal render loop

      // Cleanup (runs when is3DGSMode flips false OR component unmounts)
      return () => {
        viewer.stop()
        viewer.dispose()
      }
    }
```

### 4.3 Coexistence: Pannellum vs Three.js

```
  is3DGSMode = false  (Normal Mode)
  ──────────────────
  JSX: <PanoramaViewer />  (display: block)   ← visible, Pannellum active
                                                panorama = Cloudinary secure_url
       {false && <ThreeDGSViewer />}            ← not in DOM, viewer.dispose() already ran


  is3DGSMode = true  (Experimental Mode)
  ──────────────────────────────────────
  JSX: <PanoramaViewer />  (display: none)     ← still mounted, hidden via CSS
                                                (NOT suspended, NOT destroyed)
       <ThreeDGSViewer />                       ← newly mounted, GaussianSplats3D.Viewer initialising
                                                sceneURL = Cloudinary secure_url (.splat/.ply)


  Rule: The two renderers operate on different DOM nodes and never share state.
        React's conditional render ({is3DGSMode && ...}) controls ThreeDGSViewer.
        PanoramaViewer is ALWAYS mounted; visibility toggled via CSS display property.
        Both consume Cloudinary secure_url values as plain HTTPS strings.
```

### 4.4 GSAP — Ref-Based Animation

GSAP never touches Pannellum or Three.js nodes. It operates exclusively on React component refs for layout elements. InfoSidePanel hotspot images are served from Cloudinary URLs — GSAP animates only the panel container, not the image source.

```
  Component             Ref Target          Animation
  ──────────────────────────────────────────────────────────────────────
  BottomNavBar.jsx      navRef.current      gsap.from({ y: 80, opacity: 0 })
                                            fires once on mount via useGSAP()

  InfoSidePanel.jsx     panelRef.current    gsap.from({ x: "100%" })
                                            fires on mount (panel open)
                                            gsap.to({ x: "100%" })
                                            fires on unmount (panel close)
                                            panel displays hotspot.image
                                            (Cloudinary secure_url, if set)

  3DGS Toggle button    toggleRef.current   gsap.to({ repeat:-1, yoyo:true })
                                            continuous pulse while visible

  Room transition       multiple refs       gsap.timeline() — opacity fade +
                                            rotation sequence between rooms
```

---

## 5. Authentication Flow

Firebase Auth guards the `/admin` route via a React wrapper component (`AdminRoute.jsx`). No middleware or server-side session handling is involved. Auth scope is unchanged in v1.1 — only Firestore and Auth remain in the Firebase SDK; Storage has been removed.

```
  Browser                  React (AdminRoute.jsx)         Firebase Auth
    │                              │                           │
    │  navigate to /admin           │                           │
    │──────────────────────────────►│                           │
    │                              │  onAuthStateChanged()     │
    │                              │──────────────────────────►│
    │                              │◄──────────────────────────│  user = null
    │                              │                           │
    │◄─────────────────────────────│  <Navigate to="/login">   │
    │                              │                           │
    │  enter email + password       │                           │
    │──────────────────────────────►│                           │
    │                              │  signInWithEmailAndPassword()
    │                              │──────────────────────────►│
    │                              │◄──────────────────────────│  user = { uid, ... }
    │                              │                           │
    │◄─────────────────────────────│  render <AdminPanel>      │
    │                              │                           │
    │  [session persists on reload] │                           │
    │──────────────────────────────►│                           │
    │                              │  onAuthStateChanged()     │
    │                              │──────────────────────────►│
    │                              │◄──────────────────────────│  user = { uid, ... }
    │◄─────────────────────────────│  render <AdminPanel>      │
    │                              │                           │
    │  logout / signOut()           │                           │
    │──────────────────────────────►│  signOut()               │
    │                              │──────────────────────────►│
    │                              │◄──────────────────────────│  user = null
    │◄─────────────────────────────│  <Navigate to="/login">   │
```

**AdminRoute.jsx pattern:**
```jsx
// Three possible render states:
// user = undefined  →  still loading (show spinner, render nothing)
// user = null       →  unauthenticated → <Navigate to="/login" />
// user = object     →  authenticated  → render {children}

export default function AdminRoute({ children }) {
  const [user, setUser] = useState(undefined);          // undefined = loading

  useEffect(() => {
    return onAuthStateChanged(getAuth(), setUser);       // cleanup on unmount
  }, []);

  if (user === undefined) return <p>Loading...</p>;
  return user ? children : <Navigate to="/login" />;
}
```

---

## 6. React State Model

All viewer behaviour, navigation, and panel visibility is driven by four state variables owned by `UserTourPage`. No global state manager (Redux, Zustand) is used — `useContext` is used only for passing the Firebase `user` object into the Admin subtree.

```
  State Variable    Type           Drives                              Updated By
  ──────────────────────────────────────────────────────────────────────────────────
  activeDept        Object         Bottom nav breadcrumb               DeptFilterDropdown
                                   Room list rendered in nav bar       BottomNavBar click
                                   Which rooms are in local cache      Navigation hotspot
                                                                       (cross-dept: resolved via
                                                                       hotspot.targetDeptId)

  activeRoom        Object         PanoramaViewer imageURL prop        BottomNavBar click
                                   (Cloudinary secure_url)             Navigation hotspot
                                   PanoramaViewer hotspots prop        Guided Tour timer
                                   ThreeDGSViewer sceneURL prop
                                   (Cloudinary secure_url)
                                   3DGS toggle visibility
                                   InfoSidePanel content
                                   (hotspot.image = Cloudinary
                                   secure_url, if set)

  isSidePanelOpen   Boolean        InfoSidePanel mount / unmount       Info hotspot click
                                   GSAP slide-in trigger               Panel close button
                                   Viewer dim / blur

  is3DGSMode        Boolean        ThreeDGSViewer mount / unmount      3DGS toggle button
                                   PanoramaViewer CSS visibility
                                    (display:none when 3DGS active --
                                    NOT unmounted or suspended)
                                    viewer.dispose() on flip-off


  Auth context (useContext / prop)
  ───────────────────────────────────────────────────────────────────────────────────
  user              Object | null  AdminRoute render decision          Firebase Auth
                                   Redirect to /login if null          onAuthStateChanged
                                   Cloudinary uploads only allowed     (unchanged in v1.1)
                                   from authenticated Admin Panel
```

### State Transition Diagram

```
  ┌───────────────────────────────────────────────────────────────────┐
  │  CAMPUS VIEW (page load)                                          │
  │  activeDept = dept[0]  |  activeRoom = room[0]                   │
  │  activeRoom.imageURL = Cloudinary secure_url                      │
  │  isSidePanelOpen = false  |  is3DGSMode = false                  │
  └─────┬────────────────────────────────┬────────────────────────────┘
        │                                │
        │ dept click                      │ room click
        ▼                                ▼
  ┌───────────────┐              ┌──────────────────────────┐
  │ DEPT SELECTED  │              │   ROOM ACTIVE            │
  │ activeDept =  │              │ activeRoom = new          │
  │ clicked dept  │              │ imageURL = Cloudinary     │
  │ room list     │              │ secure_url                │
  │ refreshes     │              │ Pannellum remounts with   │
  └───────────────┘              │ new Cloudinary URL        │
                                 │ hotspots injected         │
                                 └──┬──────────────────┬─────┘
                                    │                  │
                         info hotspot click    nav hotspot click
                                    │                  │
                                    ▼                  ▼
                        ┌───────────────┐  ┌──────────────────────┐
                        │ INFO PANEL    │  │ ROOM ACTIVE          │
                        │ OPEN          │  │ (new room)           │
                        │ isSidePanelOpen│  │ imageURL = new       │
                        │  = true       │  │ Cloudinary secure_url│
                        │ viewer dimmed │  │ may switch dept      │
                        │ hotspot.image │  │ nav bar updates      │
                        │ from Cloudinary│  └──────────────────────┘
                        └───────┬───────┘
                                │ close button
                                ▼
                        ┌───────────────┐
                        │ INFO PANEL    │
                        │ CLOSED        │
                        │ isSidePanelOpen│
                        │  = false      │
                        └───────────────┘

  From ROOM ACTIVE, any room:

        3DGS toggle ON                          3DGS toggle OFF
              │                                       │
              ▼                                       ▼
  ┌────────────────────────────────┐  ┌───────────────────────────┐
  │ 3DGS MODE ACTIVE               │  │ NORMAL MODE RESUMED       │
  │ is3DGSMode = true              │──►│ is3DGSMode = false        │
  │ Three.js canvas open           │  │ ThreeDGSViewer unmounts   │
  │ sceneURL = Cloudinary          │  │ renderer.dispose()        │
  │ secure_url (.splat)            │  │ Pannellum resumes with    │
  │ Pannellum hidden via CSS       │  │ existing Cloudinary URL   │
  │ while remaining mounted in DOM │  └───────────────────────────┘
  └────────────────────────────────┘
```


---

## 7. Known Limitations (Hackathon v1)

The following limitations are intentional design decisions scoped to the 24-hour hackathon prototype. They are documented here for audit clarity and are not treated as bugs.

### 7.1 Cloudinary Asset Orphaning on Room Deletion

**Behavior:** When an admin deletes a room from the Admin Panel, the Firestore document for that room is deleted (along with its hotspot data). However, the corresponding image file (and any hotspot images) stored in Cloudinary **are not deleted** -- they remain in the Cloudinary account as orphaned assets.

**Root cause:** Cloudinary asset deletion requires a signed API request using the CLOUDINARY_API_SECRET, which must never be exposed to the client bundle. Implementing a secure deletion flow (e.g., via a Firebase Cloud Function) is out of scope for the 24-hour build window.

**Impact:** Orphaned assets consume Cloudinary storage quota but are not accessible to tour users (since the Firestore record pointing to them is gone). Within the hackathon free-tier limits (25 GB), this is not a practical concern.

**Post-hackathon fix:** Implement a Firebase Cloud Function triggered on Firestore room document deletion that calls the Cloudinary Destroy API using the stored imagePublicId field.

### 7.2 No Subcollection Cascade Delete

**Behavior:** Firestore does not automatically delete subcollections when a parent document is deleted. The Admin Panel must explicitly delete all room documents in a departments rooms subcollection before (or after) deleting the department document. This is implemented in the DeptManager component but is not atomic -- a partial failure leaves orphaned room documents.

**Post-hackathon fix:** Use a Firebase Cloud Function or Firestore batch writes to make department deletion atomic.

*CampusXR Architecture Document · v1.2 · Internal — Dev Team Only · March 2026*
