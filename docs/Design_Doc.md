CampusXR
Design Document
How It Will Work
Version 1.2  |  Hackathon Edition  |  February 2026
Changelog:
- v1.2 — Specified @mkkellogg/gaussian-splats-3d; added hotspot edit/delete; added sortOrder for Guided Tour; corrected Pannellum suspension behavior; documented Cloudinary asset orphaning
- v1.1 — Migrated file storage from Firebase Storage to Cloudinary


# 1. Product Overview


CampusXR is a web-based hybrid virtual tour platform for university campuses. It enables remote students, prospective enrollees, and accessibility users to explore campus spaces through immersive 360° panoramas. A password-protected Admin Panel lets non-technical staff update content in real time without developer intervention.

The platform operates in two rendering modes:
- Normal Mode — Pannellum-powered 360° panoramic viewer with hotspot-based navigation and JSON-driven scene switching.
- Experimental Mode — Three.js Gaussian Splatting (3DGS) renderer for neural rendering demonstrations.


## 1.1 Core User Surfaces

| Surface | Audience | Access |
| --- | --- | --- |
| User Tour Page | Students, Visitors, General Public | Public — no login required |
| Admin Panel (/admin) | Platform Administrators | Password-protected via Firebase Auth |



# 2. UI Design System



## 2.1 Global Theme & Typography

| Token | Value | Usage |
| --- | --- | --- |
| Font Family | Montserrat | All headings, body text, form labels, UI elements |
| Primary Text Color | #1A365D (Deep Navy Blue) | Headings, body copy, UI text on glassmorphic surfaces |
| Info Hotspot Color | #0047AB (Academic Blue) / #00ACC1 (Cyan) | Circular markers that open the info side panel |
| Navigation Hotspot Color | #10B981 (Emerald Green) | Circular markers that trigger room transitions |
| 3DGS Toggle Accent | #F59E0B (Amber/Gold) | Glowing border on the Experimental 3D Mode toggle button |
| Glass Border | #D1D5DB at 40% opacity | Edge definition on all glassmorphic overlay elements |



## 2.2 Glassmorphism Surface Design

All overlay UI elements — the bottom navigation bar, info side panel, search dropdowns, and the admin hotspot editor popup — use the following CSS glass material treatment based on the provided template:

```css
/* Base Glass Panel Layer */
background: linear-gradient(247.52deg, rgba(255, 0, 0, 0.17) 1.52%, rgba(255, 255, 255, 0) 96.99%);
box-shadow: inset -2px -2px 100px rgba(255, 255, 255, 0.1), inset 2px 2px 100px rgba(66, 66, 66, 0.1);
backdrop-filter: blur(25px);
border-radius: 39px;

/* Interactive Elements (Buttons/Inputs) */
background: rgba(196, 196, 196, 0.2);
border: 3px solid #FFFFFF;
border-radius: 50px;

/* Accents / Notifications */
/* Primary Accent */ background: #FF0000;
/* Secondary Accent */ background: #FF9900;
```



## 2.3 Key UI Components

Hierarchical Bottom Navigation Bar
Displays the current location as a breadcrumb trail: [ Campus ] > [ Department ] > [ Room ]. Built on the glassmorphic surface. Animates into view with a GSAP slide-up on page load. Clicking a department reloads the room list; clicking a room loads the panorama.

Info Hotspots Side Panel
Slides in from the right side of the screen using GSAP with soft easing. Contains equipment name, description text, and an optional static image (served from Cloudinary). The 360° viewer dims/blurs slightly while the panel is open. Dismissed via a close button that restores full viewer state.

Experimental 3DGS Toggle
Located top-right. Visible only when a 3DGS scene exists for the current room. Features an Amber/Gold (#F59E0B) glowing border animation. Label reads 'Experimental 3D Mode' with an 'Experimental' badge pill in glassmorphic style. On hover, a tooltip reads: 'Next-gen neural rendering demo'.

Admin Hotspot Editor Popup
A small glassmorphic form popup that appears when the admin clicks on the panorama. Fields: Hotspot Label (text input), Hotspot Type (dropdown: Info / Navigation), Description (textarea), Optional Image Upload (stored in Cloudinary). A 'Save Hotspot' button writes to Firestore. No manual coordinate entry — pitch & yaw are auto-captured from the click position.

Department Filter Dropdown & Live Search Bar
Both overlay elements use the glassmorphic surface and sit at the top-left of the viewer. The filter dropdown narrows rooms by department; the search bar filters by room name in real time on the client-side — no additional Firestore reads required.


# 3. System Architecture



## 3.1 Technology Stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend Framework | React ^19.2.4 | Component-based reactive UI driven by useState, useEffect, and useRef hooks |
| Build Tool | Vite ^6.x | Instant HMR; zero-config start; first-party Tailwind CSS v4 Vite plugin |
| Styling | Tailwind CSS v4 + @tailwindcss/vite | Glassmorphism utility classes; CSS-based @theme config; auto content detection; no config files |
| 360° Viewer | Pannellum ^2.5.6 (CDN) | Lightweight, hotspot-native, JSON config, zero WebGL complexity |
| 3DGS Renderer | Three.js ^0.183.2 + `@mkkellogg/gaussian-splats-3d` | Gaussian Splat rendering isolated from Normal Mode; `GaussianSplats3D.Viewer` handles scene load and render loop; conditional React render via is3DGSMode flag |
| UI Animations | GSAP ^3.14.2 + @gsap/react ^2.1.2 | Bottom nav slide, side panel ease-in, dropdown, toggle pulse; useGSAP() auto-cleanup prevents memory leaks |
| Database | Firebase Firestore (firebase ^12.x) | Real-time NoSQL, no backend config, hierarchical document model |
| File Storage | **Cloudinary REST Upload API (no SDK)** | 360° image and 3DGS scene file hosting; upload API returns secure_url written to Firestore |
| Authentication | Firebase Auth — Email/Password (firebase ^12.x) | Multi-admin support, no custom auth logic required |
| Hosting | Firebase Hosting (free tier) | Zero-config deployment for hackathon scale |

> **v1.1 change:** Firebase Storage has been replaced with Cloudinary for all image and scene file hosting.

## 3.2 Firestore Data Model

The data follows the three-tier spatial hierarchy of the campus:

| Collection / Field | Type | Description |
| --- | --- | --- |
| campus/departments (collection) | — | Top-level collection of all departments |
| deptId / name | String | Department display name |
| deptId / description | String | Department description text |
| deptId / rooms (subcollection) | — | Rooms belonging to the department |
| roomId / name | String | Room display name shown in navigation bar |
| roomId / sortOrder | Number | Integer ordering index for Guided Tour sequencing (e.g., 1, 2, 3) |
| roomId / imageURL | String | Cloudinary secure_url of the 360° equirectangular image |
| roomId / imagePublicId | String | Cloudinary public_id of the panorama (used for deletion/replacement) |
| roomId / splat3DUrl | String (optional) | Cloudinary secure_url of the Gaussian Splat scene file (.splat / .ply) |
| roomId / splatPublicId | String (optional) | Cloudinary public_id of the 3DGS scene file (used for deletion/management) |
| roomId / hotspots | Array | Array of hotspot objects (see below) |
| hotspot / id | String | Unique identifier generated via `crypto.randomUUID()` at save time; used for edit/delete targeting |
| hotspot / pitch | Number | Vertical angle of hotspot within the panorama (up/down) |
| hotspot / yaw | Number | Horizontal angle of hotspot within the panorama (left/right) |
| hotspot / text | String | Label or description displayed on/near the hotspot marker |
| hotspot / description | String | Full description text shown in the info side panel |
| hotspot / type | String (info \| navigation) | Determines whether clicking opens side panel or loads a room |
| hotspot / targetDeptId | String (navigation only) | deptId of the target room's parent department; required to resolve `departments/{targetDeptId}/rooms/{targetRoomId}` in Firestore |
| hotspot / targetRoomId | String (navigation only) | roomId to load; supports cross-department targets |
| hotspot / image (optional) | String | Cloudinary secure_url for optional static image in side panel |
| hotspot / imagePublicId (optional) | String | Cloudinary public_id of the hotspot image |

> **v1.1 change:** `imageURL` fields now store Cloudinary `secure_url` values. `imagePublicId` fields added to enable future deletion/replacement operations via the Cloudinary API.

## 3.3 Component Read/Write Map

| Component | Reads From | Writes To |
| --- | --- | --- |
| User Tour Page (Pannellum) | Firestore (rooms, hotspots), Cloudinary CDN (images via secure_url) | — |
| User Tour Page (Three.js 3DGS) | Cloudinary CDN (3DGS scene files via secure_url) | — |
| Admin Panel — Content Management | Firestore (all collections), Cloudinary (image retrieval) | Firestore (all collections), Cloudinary (image uploads) |
| Firebase Auth | — | Authenticated session tokens |

> **v1.1 change:** Firebase Storage references removed. All media reads/writes now go through Cloudinary.


# 4. User Tour Page — How It Works



## 4.1 Page Load & Initialisation Flow

| 1 | Page Load Browser fetches the React + Vite bundle from Firebase Hosting. GSAP, Pannellum, and Three.js libraries are loaded. |
| --- | --- |


| 2 | Firestore Bootstrap JavaScript fetches the full departments collection and the rooms subcollection for the default department. Data is stored in a local JS object to avoid repeated reads. Each room document includes a Cloudinary secure_url as its imageURL. |
| --- | --- |


| 3 | Default Room Load The first room in the default department is loaded into Pannellum. The equirectangular imageURL (Cloudinary secure_url) is passed to the viewer. Pitch and yaw reset to the room's default values. |
| --- | --- |


| 4 | Navigation Bar Renders The bottom navigation bar animates up with a GSAP slide-up. It renders: [ Campus ] > [ Default Dept ] > [ First Room ]. Active room is visually highlighted. |
| --- | --- |


| 5 | Hotspots Injected Hotspot objects from Firestore are passed into Pannellum's config as the `hotSpots` array. Because `hotspots` is included in the `useEffect` dependency array alongside `imageURL`, the viewer automatically re-mounts if the Admin Panel updates the hotspot set in real time. Blue markers are placed for Info hotspots; Green markers for Navigation hotspots. Optional hotspot images are served from Cloudinary secure URLs. |
| --- | --- |



## 4.2 User Navigation Flow

Scenario: User selects a Department, then a Room, then interacts with a hotspot.

| 1 | Department Click User clicks a department name in the bottom bar. The room list for that department is fetched from the local cache (or Firestore if not yet loaded) and rendered in the nav bar. |
| --- | --- |


| 2 | Room Click User clicks a room. Pannellum viewer fades out and loads the new imageURL (Cloudinary secure_url). Pitch/yaw reset. The bottom breadcrumb updates to: [ Campus ] > [ Selected Dept ] > [ Selected Room ]. |
| --- | --- |


| 3 | Info Hotspot Click (Blue Marker) User clicks a blue circular hotspot. The info side panel slides in from the right via GSAP ease-in. The 360° background dims. Panel displays equipment name, description, and optional image (served from Cloudinary). |
| --- | --- |


| 4 | Navigation Hotspot Click (Green Marker) User clicks a green circular hotspot. Pannellum fires an animated fade + rotate transition. The `targetDeptId` and `targetRoomId` fields from the hotspot object are used to fetch the linked room from Firestore path `departments/{targetDeptId}/rooms/{targetRoomId}`. The bottom nav bar updates to reflect the new active department and room. |
| --- | --- |


| 5 | Panel Dismiss User clicks the close button on the side panel. GSAP slides the panel out. Background dim/blur removes. Viewer restores full interactive state. |
| --- | --- |



## 4.3 Experimental 3DGS Mode Flow

| 1 | Visibility Check When a room loads, the JS checks if the room's Firestore document has an associated 3DGS scene URL (Cloudinary secure_url). If yes, the Experimental 3D Mode toggle appears (top-right). If no scene exists, toggle remains hidden. |
| --- | --- |


| 2 | Toggle Activated User clicks the Amber/Gold glowing toggle. An animated mode-switch transition plays. The Pannellum viewer **remains mounted in the DOM but is hidden via CSS** (`display:none` or `z-index` layering) — it is not destroyed or suspended. The Three.js (`GaussianSplats3D.Viewer`) canvas opens in an overlay on top. |
| --- | --- |


| 3 | 3DGS Scene Loads Three.js fetches the Gaussian Splat scene file from its Cloudinary secure_url. The scene renders inside the Three.js canvas. Users can orbit/explore the 3D reconstruction. |
| --- | --- |


| 4 | Exit 3DGS Mode User toggles off. The Three.js canvas closes. Pannellum viewer resumes. No state is lost in Normal Mode. |
| --- | --- |



## 4.4 Optional Features (Build If Time)

| Feature | How It Works |
| --- | --- |
| Department Filter Dropdown | Top-left glassmorphic dropdown. On selection, JS filters the already-fetched room dataset client-side. Updates the bottom nav bar without any new Firestore reads. |
| Live Search Bar | Top-left text input. On each keypress, JS filters rooms by name and department from the in-memory dataset. Results update in real time. Zero backend calls. |
| Auto Guided Tour Mode | A 'Guided Tour' button triggers a JS timer. Every X seconds, the next room in sequence is loaded with a GSAP smooth transition. Rooms are visited in ascending `sortOrder` field order, using `orderBy("sortOrder")` in the Firestore query. User can stop at any time via a Stop button. |
| URL Hash Deep-linking | On room load, the URL updates to e.g. #dept=science&room=physics-lab. On initial page load with a valid hash, the viewer directly loads the specified room, bypassing the default. |

> **v1.1 change:** Room image uploads now go to Cloudinary instead of Firebase Storage. The upload utility sends a `multipart/form-data` POST request to the Cloudinary Upload API using an unsigned upload preset (`campusxr_upload`). No Firebase Storage SDK calls are made.


# 5. Admin Panel — How It Works



## 5.1 Authentication Flow

| 1 | Navigate to /admin User visits the /admin route. The Firebase Auth listener checks the current session state. |
| --- | --- |


| 2 | Unauthenticated — Redirect If no valid session exists, the user is immediately redirected to the Login page. No admin content is rendered. |
| --- | --- |


| 3 | Login with Firebase Auth Admin enters their Email and Password. Firebase Auth validates credentials against the registered admin accounts. On success, a session token is issued. |
| --- | --- |


| 4 | Access Granted The auth listener detects the valid session and renders the Admin Dashboard. Multiple admin accounts are supported; each operates independently. |
| --- | --- |



## 5.2 Overview Dashboard

The dashboard reads summary data from Firestore and displays:
- Total number of Departments currently in the platform.
- Total number of Rooms across all departments.
- A log of Recent Updates — the last N changes made to the content.
All stat cards use the glassmorphic gradient background and Montserrat typography in Deep Navy Blue (#1A365D).


## 5.3 Content Management Flows

Department Management
| Action | How It Works |
| --- | --- |
| Add Department | Admin enters a name and description. JS writes a new document to the campus/departments Firestore collection. Change is immediately live on the User Tour Page. |
| Edit Department | Admin selects a department, updates the name/description fields, and saves. JS updates the existing Firestore document. |
| Delete Department | Admin deletes a department. JS deletes the department document AND all room documents in its subcollection. Rooms are immediately removed from the live tour. |


Room Management
| Action | How It Works |
| --- | --- |
| Add Room | Admin selects a department, enters a room name, and uploads a 360° equirectangular image. The image is uploaded to Cloudinary via the Upload API; the returned secure_url is written to roomId/imageURL in Firestore, and public_id is written to roomId/imagePublicId. |
| Edit Room | Admin updates the room name or replaces the 360° image. A new Cloudinary upload generates a new secure_url and public_id, which overwrite the existing Firestore imageURL and imagePublicId fields. |
| Delete Room | Admin deletes the room. The Firestore document is removed. The room disappears from the live tour navigation immediately. |

> **v1.1 change:** Room image uploads now go to Cloudinary instead of Firebase Storage. The upload utility sends a `multipart/form-data` POST request to the Cloudinary Upload API using an unsigned upload preset (`campusxr_upload`). No Firebase Storage SDK calls are made.


## 5.4 Hotspot Editor — Click-to-Place Flow

The Hotspot Editor is accessed from within any room in the Admin Panel.

| 1 | Open Room in Editor Admin navigates to a room and opens the Hotspot Editor. The room's 360° panorama (loaded from its Cloudinary secure_url) renders inside the editor view — the same Pannellum viewer as the public tour. |
| --- | --- |


| 2 | Click to Place Admin clicks anywhere on the panorama. Pannellum's click event fires, automatically capturing the exact pitch (vertical angle) and yaw (horizontal angle) values at the click position. No manual coordinate entry is needed. |
| --- | --- |


| 3 | Popup Form Appears The glassmorphic Admin Hotspot Editor Popup appears at the click location. Fields: Hotspot Label (text input), Hotspot Type (dropdown: Info / Navigation), Description (textarea), Optional Image Upload (uploaded to Cloudinary on selection). For Navigation type, a Target Room selector also appears. |
| --- | --- |


| 4 | Save Hotspot Admin clicks 'Save Hotspot'. JS writes the hotspot object `{ id: crypto.randomUUID(), pitch, yaw, text, type, description, [targetDeptId], [targetRoomId], [image (Cloudinary secure_url)], [imagePublicId] }` to the hotspots array in the room's Firestore document using `arrayUnion`. The hotspot is immediately live on the public tour — no page reload required. |


| 5 | Hotspot Visible on Tour The User Tour Page, reading from Firestore in real time, renders the new hotspot on the panorama as either a Blue (info) or Green (navigation) marker. Optional hotspot images are served directly from Cloudinary. |
| --- | --- |

**Hotspot Edit and Delete:**

| Action | How It Works |
| --- | --- |
| Edit Hotspot | Firestore arrays cannot mutate individual elements by index. The admin selects the hotspot to edit, modifies the fields in the popup, and JS replaces the entire `hotspots` array: `updateDoc(roomRef, { hotspots: updatedHotspotArray })`. |
| Delete Hotspot | JS calls `updateDoc(roomRef, { hotspots: arrayRemove(hotspotObject) })`. The exact hotspot object must be passed for Firestore to match and remove it. |
| --- | --- |

| 5 | Hotspot Visible on Tour The User Tour Page, reading from Firestore in real time, renders the new hotspot on the panorama as either a Blue (info) or Green (navigation) marker. Optional hotspot images are served directly from Cloudinary. |
| --- | --- |



# 6. Hotspot System Design


| Hotspot Type | Visual Marker | User Action | Result | Firestore Fields |
| --- | --- | --- | --- | --- |
| Info | Blue circular marker (#0047AB or #00ACC1) | Click on blue dot | Glassmorphic side panel slides in from right with equipment name, description, optional image (Cloudinary secure_url) | type: 'info', text, description, image (Cloudinary secure_url, optional), imagePublicId (optional) |
| Navigation | Green circular marker (#10B981) | Click on green dot | Animated fade+rotate transition loads the linked room (cross-department supported). Bottom nav updates to reflect the new active dept and room. | `type: 'navigation'`, `text`, `targetDeptId`, `targetRoomId` |



# 7. Application State Overview


The following describes the primary application states and how the system transitions between them:

| State | Description | Triggered By |
| --- | --- | --- |
| Campus View | Default state. First room of default department loaded. Bottom nav visible. | Page load |
| Department Selected | Room list updates for selected dept. Bottom nav breadcrumb updates. | Department click in nav bar |
| Room Active | 360° panorama (Cloudinary image) for selected room loaded. Hotspots rendered. Pitch/yaw reset. | Room click in nav bar or navigation hotspot |
| Info Panel Open | Side panel visible. Viewer dimmed/blurred. Hotspots inactive. | Blue info hotspot click |
| Info Panel Closed | Viewer restored. Hotspots re-active. | Close button on side panel |
| 3DGS Mode Active | Three.js (`GaussianSplats3D.Viewer`) canvas overlay open. Pannellum viewer **hidden via CSS** (`display:none` — NOT destroyed). 3DGS scene (from Cloudinary) rendering. | Experimental 3D Mode toggle ON |
| 3DGS Mode Exited | Three.js canvas closed. Pannellum resumed with same state. | Experimental 3D Mode toggle OFF |
| Guided Tour Running | Auto-advance timer active. Rooms load sequentially with GSAP transitions. | 'Guided Tour' button click |
| Guided Tour Stopped | Timer cleared. User regains manual control of navigation. | 'Stop Tour' button or manual navigation |



# 8. Environment Configuration

The following environment variables must be present in `.env.local` for local development and in the deployment environment for production.

## 8.1 Required Variables

```
# Cloudinary — Image Storage & Delivery
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=campusxr_upload

# Firebase — Database & Auth only (Storage no longer used)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 8.2 Server-Side Only (never expose to client)

```
# Required only if signed Cloudinary uploads are used (not needed for unsigned preset)
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> ⚠️ `CLOUDINARY_API_SECRET` must never be prefixed with `VITE_` or included in the client bundle.

## 8.3 Removed Variables (v1.1)

```
# No longer required — Firebase Storage has been removed:
# VITE_FIREBASE_STORAGE_BUCKET=   ← REMOVED
```


# 9. Demo Readiness Checklist


Given the 24-hour hackathon window, the following must-haves must be functional before demo time:

| Priority | Feature | Demo Showstopper? |
| --- | --- | --- |
| Tier 1 | Firebase project setup (Auth, Firestore, Hosting) + Cloudinary account + unsigned upload preset | Yes |
| Tier 1 | Firestore schema seeded with demo rooms and hotspots | Yes |
| Tier 1 | Cloudinary upload utility (`uploadImageToCloudinary`) implemented and tested | Yes |
| Tier 1 | Pannellum 360° viewer — dynamic room load from Firestore (image from Cloudinary) | Yes |
| Tier 1 | Bottom navigation bar with GSAP slide-up animation | Yes |
| Tier 1 | Info & Navigation hotspot system | Yes |
| Tier 1 | Info side panel (GSAP slide-in from right) | Yes |
| Tier 1 | Experimental 3DGS toggle + Three.js scene loader (scene from Cloudinary) | Yes |
| Tier 1 | Admin Panel — Firebase Auth login page | Yes |
| Tier 1 | Admin Panel — Department & Room management (image upload to Cloudinary) | Yes |
| Tier 1 | Admin Panel — Hotspot Editor (click-to-place) | Yes |
| Tier 2 (Build If Time) | Department Filter Dropdown | No |
| Tier 2 (Build If Time) | Live Search Bar | No |
| Tier 2 (Build If Time) | Auto Guided Tour Mode | No |
| Tier 3 (Nice-to-Have) | URL Hash Deep-linking | No |

> **v1.1 change:** Firebase Storage setup removed from Tier 1. Cloudinary account setup and upload preset configuration added as Tier 1 prerequisites.


# Known Limitations (Hackathon v1)

The following are intentional design limitations for the 24-hour hackathon prototype.

| Limitation | Description | Post-Hackathon Fix |
| --- | --- | --- |
| Cloudinary Asset Orphaning | When a room is deleted, its Firestore document is removed but the Cloudinary image (and hotspot images) remain stored as orphaned assets. Client-side Cloudinary deletion is not possible without exposing the API secret. | Implement a Firebase Cloud Function triggered on room deletion that calls the Cloudinary Destroy API using the stored `imagePublicId`. |
| No Subcollection Cascade Delete | Firestore does not auto-delete subcollections on parent deletion. Rooms must be explicitly deleted before their parent department document. A partial failure leaves orphaned room records. | Use Firestore batch writes or a Cloud Function for atomic deletion. |


# Appendix: Glossary


| Term | Definition |
| --- | --- |
| 360° Panorama | Equirectangular photographic image covering the full spherical field of view of a location |
| 3DGS / Gaussian Splatting | Neural rendering technique reconstructing 3D scenes from photos using Gaussian functions; rendered via Three.js |
| Pannellum | Open-source MIT lightweight JS library for rendering 360° panoramas with built-in hotspot support |
| Glassmorphism | UI design style using translucent backgrounds, backdrop-filter blur, and subtle borders to create floating glass panels |
| Hotspot | Interactive clickable marker on a panorama. Info type opens side panel; Navigation type loads another room |
| Pitch | Vertical angle (up/down) of a hotspot's position within a panorama |
| Yaw | Horizontal angle (left/right) of a hotspot's position within a panorama |
| GSAP | GreenSock Animation Platform — JS animation library for all UI transitions |
| Firestore | Google Firebase's NoSQL cloud document database storing the campus hierarchy and hotspot data |
| Cloudinary | Cloud-based media storage and delivery platform. Replaces Firebase Storage for all image and 3DGS scene file hosting. Upload API returns a secure_url and public_id. |
| secure_url | HTTPS URL returned by Cloudinary after a successful upload; stored in Firestore as imageURL for use by Pannellum and Three.js |
| public_id | Cloudinary's unique asset identifier; stored in Firestore as imagePublicId for future deletion or replacement operations |
| Upload Preset | Cloudinary configuration profile defining upload rules; unsigned presets allow client-side uploads without exposing the API secret |
| Firebase Storage | ~~Google Firebase's cloud object storage~~ — **removed in v1.1; replaced by Cloudinary** |