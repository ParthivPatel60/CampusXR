CampusXR
Product Requirements Document
Version 1.3  |  Hackathon Edition  |  February 2026
Status: Internal Working Document  |  Audience: Development Team (3)
Changelog:
- v1.3 — Fixed §8.3/§8.4 numbering conflict; renumbered Known Limitations to §8.4; added targetDeptId field to navigation hotspot schema
- v1.2 — Added hotspot edit/delete documentation; added sortOrder field for Guided Tour; documented Cloudinary asset orphaning Known Limitation
- v1.1 — Migrated file storage from Firebase Storage to Cloudinary


# 1. Executive Summary


## 1.1 Product Overview

CampusXR is a web-based hybrid virtual tour platform built for a specific university or college. It enables remote students, prospective students, and visitors with accessibility needs to explore the campus digitally through immersive 360° panoramic views and an experimental Gaussian Splatting (3DGS) rendering mode. The platform comprises two primary surfaces: a public-facing User Tour Page and a password-protected Admin Panel.


## 1.2 Vision & Objectives

The core problem CampusXR solves is three-fold:
- Remote students cannot physically visit campus facilities.
- Prospective students lack an engaging, interactive way to preview campus environments before enrollment decisions.
- Visitors with disabilities or mobility constraints face barriers to campus exploration.

CampusXR addresses these problems by delivering:
- A hierarchical, navigable digital twin of campus spaces (Campus → Department → Room).
- An admin-editable content backend so rooms, hotspots, and descriptions stay current without developer intervention.
- An experimental next-generation 3D rendering mode (3DGS) that showcases cutting-edge neural rendering for judge impact.


## 1.3 Target Users

| User Segment | Primary Need | Interaction Surface |
| --- | --- | --- |
| Remote Students | Explore campus facilities not physically accessible to them | User Tour Page |
| Prospective Students | Preview departments and rooms before enrollment decisions | User Tour Page |
| Disabled / Accessibility Users | Barrier-free virtual campus exploration | User Tour Page |
| General Public | Campus awareness and discovery | User Tour Page |
| Platform Administrators | Manage departments, rooms, hotspots, and media | Admin Panel |



## 1.4 Key Success Metrics

Given the hackathon context, success is measured against the following criteria:
| Metric | Target | How Measured |
| --- | --- | --- |
| Judge Score | Top evaluation ranking | Hackathon judge scoring rubric |
| User Testing Feedback | Positive usability response | Live demo session observations |
| Rooms Loaded Successfully | All demo rooms load without error | Live walkthrough during demo |
| System Uptime During Demo | 100% uptime for the demo window | No crashes or broken states during presentation |



# 2. Product Definition


## 2.1 Product Name & Description

Name: CampusXR
Type: Web application (Desktop, Chrome + cross-browser)
Deployment: Firebase Hosting (free tier)
Build Context: 24-hour hackathon prototype
Team Size: 3 developers


## 2.2 Core Problem Statement

Traditional campus visits are inaccessible to a significant portion of stakeholders — students in remote locations, prospective enrollees evaluating multiple institutions, and individuals with physical disabilities. Static photo galleries and pre-recorded video tours fail to offer interactivity, spatial navigation, or real-time content management. CampusXR replaces these with a structured, dynamic, and editable 360° virtual tour that mirrors the actual spatial hierarchy of a campus.


## 2.3 Solution Overview

CampusXR is a hybrid-mode web application with two rendering engines:
- Normal Mode: Pannellum-powered 360° panoramic viewer with hotspot-based navigation and JSON-driven scene switching.
- Experimental Mode: Three.js-powered Gaussian Splatting (3DGS) renderer for neural rendering demonstrations.

Content is stored in Firebase Firestore (metadata/structure) and Cloudinary (image and scene file hosting), manageable through a role-access Admin Panel without requiring code changes. The public tour navigates a three-tier hierarchy: Campus → Department → Room.


## 2.4 Key Features Summary

| Feature | Priority | Mode |
| --- | --- | --- |
| 360° Panorama Viewer (Pannellum) | Must Have | Normal |
| Hierarchical Bottom Navigation Bar | Must Have | Normal |
| Info Hotspots (side panel) | Must Have | Normal |
| Navigation Hotspots (cross-department) | Must Have | Normal |
| Experimental 3DGS Toggle | Must Have | Experimental |
| Admin Panel — Department Management | Must Have | Admin |
| Admin Panel — Room Management | Must Have | Admin |
| Admin Panel — Hotspot Editor (click-to-place) | Must Have | Admin |
| Multi-Admin Role-Based Access (Firebase Auth) | Must Have | Admin |
| Department Filter Dropdown | Build If Time | Normal |
| Live Search Bar | Build If Time | Normal |
| Auto Guided Tour Mode | Build If Time | Normal |
| URL Hash Deep-linking | Nice-to-Have | Normal |
| Mini Map | Future Enhancement | Normal |
| Guided Tour Admin Sequencing | Future Enhancement | Admin |



# 3. User Personas & Scenarios


## 3.1 Primary Personas


### Persona A — Remote Student

Name: Aisha, 20
Situation: Enrolled at the university but living off-campus; wants to find the 3D printing lab before her first in-person class.
Goal: Navigate to a specific room, understand what equipment is available, and find the connecting corridor to the lab.
Pain Point: Campus maps are static PDFs with no room-level detail.


### Persona B — Prospective Student

Name: Daniel, 17
Situation: Shortlisting universities; wants to compare facilities before deciding where to apply.
Goal: Explore multiple departments in a single session and get a feel for the campus atmosphere.
Pain Point: Pre-recorded tours are linear and cannot be browsed freely.


### Persona C — Platform Administrator

Name: Priya, Campus IT Coordinator
Situation: Responsible for keeping the virtual tour up-to-date as labs are renovated and equipment changes.
Goal: Add new room panoramas and update hotspot labels without needing a developer.
Pain Point: Previous static tour required developer deployments for any content update.


## 3.2 User Journey — Student Tour

- User lands on the Campus View; bottom navigation bar is visible.
- User selects a Department from the bottom bar or top filter dropdown.
- Room list loads dynamically; user selects a Room.
- Pannellum loads the 360° panorama (served via Cloudinary CDN) with a smooth fade transition.
- Hotspots appear overlaid on the panorama.
- User clicks an Info Hotspot → side panel slides in with equipment details and optional image.
- User clicks a Navigation Hotspot → transitions to a linked room (may be in a different department).
- User optionally activates Experimental 3DGS Mode via the top-right toggle.
- User optionally activates Guided Tour Mode for an automated room-by-room walkthrough.


## 3.3 User Journey — Admin Content Update

- Admin navigates to /admin; if not authenticated, redirected to login.
- Admin logs in with Firebase Email/Password credentials.
- Admin views the Overview Dashboard (department count, room count, recent updates).
- Admin selects a Department to manage and adds or edits a Room.
- Admin uploads a 360° image via the Admin Panel; image is stored in Cloudinary and the returned secure_url is written to Firestore.
- Admin opens the Hotspot Editor for a room — 360° image displayed from Cloudinary URL.
- Admin clicks on the panorama to auto-capture pitch & yaw coordinates.
- Popup appears; admin enters hotspot text and saves.
- Changes are immediately reflected in Firestore and live to tour users.


# 4. Functional Requirements


## 4.1 User Tour Page


### FR-01: 360° Panorama Viewer

| Attribute | Specification |
| --- | --- |
| Library | Pannellum (MIT License, pure JS) |
| Image Type | Equirectangular 360° (format TBD — JPG/PNG expected) |
| Load Source | Dynamic fetch from Firebase Firestore (room imageURL field — Cloudinary secure_url) |
| Transition | Smooth fade transition between rooms |
| Initial State | Pitch and yaw reset to room defaults on each load |
| Controls | Fullscreen toggle, zoom controls |
| UI Element | Room title displayed bottom-left of viewer |
| Offline | Noted as a Pannellum capability; not a stated platform requirement |


Acceptance Criteria:
- Panorama loads within a reasonable time on a standard desktop broadband connection.
- Pitch and yaw reset correctly every time a new room is loaded.
- Fullscreen mode activates and deactivates without viewer state loss.
- Room title reflects the correct room name from Firestore.


### FR-02: Hierarchical Bottom Navigation Bar

The bottom navigation bar renders the current navigation context as:
[ Campus ] > [ Department ] > [ Room ]

| Behavior | Specification |
| --- | --- |
| Department Click | Dynamically loads the room list for the selected department |
| Room Click | Loads the corresponding 360° panorama into the viewer |
| Active State | Currently selected room is visually highlighted |
| Animation | GSAP slide-up animation on navigation bar appearance |


Acceptance Criteria:
- Clicking a department renders its rooms without page reload.
- Active room indicator updates on every room change.
- Navigation breadcrumb accurately reflects Campus > Dept > Room at all times.


### FR-03: Info Hotspots

| Attribute | Specification |
| --- | --- |
| Visual Indicator | Blue circular hotspot marker on panorama |
| Trigger | Click on hotspot marker |
| Panel Position | Slides in from the right side of the screen |
| Panel Content | Equipment name, description, optional image (no video/audio) |
| Background Effect | Viewer dims/blurs slightly when panel is open |
| Animation | GSAP slide-in with soft easing |
| Dismiss | Close button on panel |


Acceptance Criteria:
- Info panel renders all Firestore hotspot fields (text, description, optional image via Cloudinary URL).
- Background blur activates when panel opens and removes when panel closes.
- Close button fully dismisses panel and restores viewer state.


### FR-04: Navigation Hotspots

| Attribute | Specification |
| --- | --- |
| Visual Indicator | Green circular hotspot marker on panorama |
| Trigger | Click on hotspot marker |
| Behavior | Loads linked room — may be in a different department |
| Transition | Animated fade + rotate effect |
| Firestore Field | type: 'navigation'; links to roomId (any department) |


Acceptance Criteria:
- Clicking a navigation hotspot loads the target room correctly, including cross-department targets.
- Bottom navigation bar updates to reflect the newly active department and room.
- Transition animation plays without viewer freeze or error.


### FR-05: Experimental 3DGS Mode

| Attribute | Specification |
| --- | --- |
| Toggle Button | Top-right; labelled 'Experimental 3D Mode' with 'Experimental' badge |
| Visibility | Only visible when a 3DGS scene exists for the current room |
| Visual Cue | Glowing border effect on toggle; tooltip reads 'Next-gen neural rendering demo' |
| Behavior | Opens modal or separate view; loads Three.js Gaussian Splat scene |
| Content | Actual 3DGS content available for demo (not a placeholder) |
| Renderer | Three.js (separate from Pannellum Normal Mode) |
| Animation | Animated mode switch transition |
| Scene Source | 3DGS scene files served from Cloudinary (raw/auto resource type) |


Acceptance Criteria:
- Toggle is hidden when no 3DGS scene is associated with the current room.
- 3DGS scene loads and renders in Three.js without crashing the Normal Mode viewer.
- Tooltip text displays correctly on hover.


### FR-06: Department Filter Dropdown (Build If Time)

- Top-left dropdown filters the room list by department.
- Selection updates the bottom navigation bar and room list dynamically.
- No backend query required — filter operates on already-fetched data.


### FR-07: Live Search Bar (Build If Time)

- Search bar accepts text input and filters rooms by name and department.
- Filtering is performed client-side in JavaScript against the loaded dataset.
- Results update in real time as the user types.


### FR-08: Auto Guided Tour Mode (Build If Time)

| Attribute | Specification |
| --- | --- |
| Trigger | User clicks 'Guided Tour' button |
| Behavior | Automatically advances through rooms at a configurable interval (X seconds) |
| Room Order | Rooms are sequenced by the `sortOrder` field in Firestore, queried with `orderBy("sortOrder")` for deterministic ordering |
| Transition | GSAP smooth transition between rooms |
| Stop Control | User can stop the guided tour at any point |



### FR-09: URL Hash Deep-linking (Nice-to-Have)

When implemented, the URL updates to reflect the active state:
#dept=computer&room=lab1
- Enables shareable direct links to specific rooms.
- On page load with a valid hash, the viewer loads the specified room directly.


## 4.2 Admin Panel


### FR-10: Authentication

| Attribute | Specification |
| --- | --- |
| Method | Firebase Email/Password Authentication |
| Multi-Admin | Yes — multiple admin accounts supported |
| Roles | Role-based access via Firebase Auth (exact roles: TBD by development team) |
| Login Flow | Navigate to /admin → if unauthenticated → redirect to login page → Firebase Auth verifies → access granted |
| Session | Firebase Auth session management (default Firebase behavior) |


Acceptance Criteria:
- Unauthenticated access to /admin redirects to the login page.
- Authenticated users gain access to the Admin Dashboard.
- Multiple admin accounts can be created and used independently.


### FR-11: Overview Dashboard

- Displays total number of Departments.
- Displays total number of Rooms.
- Displays a log of Recent Updates.


### FR-12: Department Management

- Add a new department (name, description).
- Edit an existing department's name and description.
- Delete a department (and its associated rooms).

Acceptance Criteria:
- New departments appear immediately in the public tour department list.
- Deleted departments remove all associated rooms from the tour.


### FR-13: Room Management

- Add a new room within a department.
- Upload a 360° image via the Admin Panel; the image is sent to Cloudinary and the returned secure_url is written to Firestore as imageURL.
- Edit an existing room's name and image.
- Delete a room.

Acceptance Criteria:
- Uploaded images are accessible via their Cloudinary secure_url in the panorama viewer.
- Deleted rooms are immediately removed from the tour navigation.


### FR-14: Hotspot Editor

| Attribute | Specification |
| --- | --- |
| Access | Admin opens a room in the admin panel |
| Display | 360° room panorama rendered inside the editor (image loaded from Cloudinary URL) |
| Add Hotspot | Admin clicks anywhere on the panorama; pitch & yaw auto-captured |
| Popup | Small form popup: enter hotspot text, select type (info/navigation), save |
| No Manual Coordinates | Pitch/yaw populated automatically; no manual numeric entry required |
| Hotspot Object Saved | { id, pitch, yaw, text, type, description, [targetDeptId], [targetRoomId] } stored in Firestore hotspots array |
| Image on Info Hotspot | Optional image upload (static image only; no video or audio) — stored in Cloudinary |


Acceptance Criteria:
- Clicking on the panorama in the editor correctly captures pitch and yaw values.
- Saved hotspots appear on the live tour panorama without requiring a page reload.
- Navigation hotspots require a valid target roomId (cross-department supported).
- Optional hotspot images are served from Cloudinary secure URLs.
- Existing hotspots can be edited: the full `hotspots` array is replaced via `updateDoc(roomRef, { hotspots: updatedHotspotArray })`.
- Existing hotspots can be deleted: `updateDoc(roomRef, { hotspots: arrayRemove(hotspotObject) })` removes the exact matching hotspot.

> **Note:** Firestore arrays cannot mutate individual elements by index. Edit uses full array replacement; delete uses `arrayRemove`.


# 5. Technical Architecture


## 5.1 Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Frontend Framework | React ^19.2.4 | Component-based reactive UI; useState/useEffect/useRef drive all viewer and nav state |
| Build Tool | Vite ^6.x | Instant HMR; zero-config React + JSX scaffolding; first-party Tailwind CSS v4 plugin |
| Styling | Tailwind CSS v4 + @tailwindcss/vite | Utility-first glassmorphism; CSS-based @theme config; no tailwind.config.js or postcss.config.js |
| 360° Viewer | Pannellum ^2.5.6 (CDN) | Lightweight, hotspot-native, JSON config, no WebGL complexity |
| 3DGS Renderer | Three.js ^0.183.2 | Gaussian Splat rendering for experimental mode; isolated from Normal Mode via React conditional render |
| UI Animations | GSAP ^3.14.2 + @gsap/react ^2.1.2 | Bottom nav, side panel, dropdown, page load, experimental toggle pulse; automatic cleanup via useGSAP() |
| Database | Firebase Firestore (firebase ^12.x) | Real-time, ready-to-use, no backend configuration needed |
| File Storage | **Cloudinary REST Upload API (no SDK)** | 360° image and 3DGS scene file hosting; upload API returns secure_url written to Firestore |
| Authentication | Firebase Auth — Email/Password (firebase ^12.x) | Built-in multi-admin support, no custom auth logic |
| Hosting | Firebase Hosting (free tier) | Zero-config deployment, free for hackathon scale |



## 5.2 Database Schema (Firestore)

The Firestore data model follows a hierarchical structure:

| Collection / Field | Type | Description |
| --- | --- | --- |
| campus/departments (collection) | — | Top-level collection of all departments |
| deptId/name | String | Department display name |
| deptId/description | String | Department description |
| deptId/rooms (subcollection) | — | Rooms belonging to this department |
| roomId/name | String | Room display name |
| roomId/sortOrder | Number | Integer ordering index for Guided Tour sequencing (e.g., 1, 2, 3) |
| roomId/imageURL | String | Cloudinary secure_url of the 360° panorama image |
| roomId/imagePublicId | String | Cloudinary public_id of the panorama (used for deletion/management) |
| roomId/splat3DUrl | String (optional) | Cloudinary secure_url of the Gaussian Splat scene file (.splat / .ply) |
| roomId/splatPublicId | String (optional) | Cloudinary public_id of the 3DGS scene file (used for deletion/management) |
| roomId/hotspots | Array | Array of hotspot objects (see below) |
| hotspot/id | String | Unique identifier generated via `crypto.randomUUID()` at save time; used for edit/delete targeting |
| hotspot/pitch | Number | Vertical angle of hotspot position |
| hotspot/yaw | Number | Horizontal angle of hotspot position |
| hotspot/text | String | Label or description shown on hotspot |
| hotspot/description | String | Full description text shown in the info side panel |
| hotspot/type | String (info \| navigation) | Determines hotspot behaviour |
| hotspot/image | String (optional) | Cloudinary secure_url for optional static image in info side panel |
| hotspot/imagePublicId | String (optional) | Cloudinary public_id of hotspot image |
| hotspot/targetDeptId | String (navigation only) | deptId of the target room's parent department; required for cross-department navigation to resolve the correct Firestore subcollection path |
| hotspot/targetRoomId | String (navigation only) | roomId to load on navigation hotspot click |



## 5.3 Architecture Diagram (Logical)

The following represents the logical data and rendering flow:
| Component | Reads From | Writes To |
| --- | --- | --- |
| User Tour Page (Pannellum) | Firestore (rooms, hotspots), Cloudinary CDN (images via secure_url) | — |
| User Tour Page (Three.js) | Cloudinary CDN (3DGS scene files via secure_url) | — |
| Admin Panel | Firestore (all collections), Cloudinary (image uploads) | Firestore (all collections), Cloudinary (image uploads) |
| Firebase Auth | — | Authenticated session tokens |



## 5.4 Platform & Device Requirements

| Requirement | Specification |
| --- | --- |
| Target Device | Desktop only |
| Browser Support | Chrome (primary) + cross-browser (Firefox, Edge, Safari — best effort) |
| Mobile Support | Out of scope for this build |
| Internet Requirement | Required (Firebase + Cloudinary backend); offline not a stated requirement |
| Image Formats | JPG/PNG/WebP — Cloudinary accepts all standard formats and auto-converts on delivery |
| Firebase Security Rules | Test mode for hackathon duration; production rules are out of scope |
| Cloudinary Upload Preset | Use unsigned upload preset for client-side uploads OR signed uploads via backend route |



# 6. Success Metrics & KPIs

As a hackathon prototype, success metrics are demo-scoped rather than production business metrics.

| Metric Category | Metric | Target | Measurement Method |
| --- | --- | --- | --- |
| Adoption | Rooms loaded during demo | All demo rooms load | Live walkthrough |
| Reliability | Uptime during demo session | 100% — no crashes | Observation |
| Usability | User testing feedback | Positive responses | Demo session feedback |
| Judge Impact | Judge evaluation score | Top-tier ranking | Hackathon scoring rubric |
| Feature Completeness | Must-Have features built | All 5 must-haves delivered | Feature checklist |
| Content Editability | Admin panel demonstrates live edit → reflect on tour | Successful live demo | Admin demo during presentation |



## 6.1 Demo Showstopper Criteria

The following constitute demo failures that must be prevented at all costs:
- Panorama viewer fails to load any room.
- Admin panel authentication fails during the demo.
- Experimental 3DGS mode crashes the browser.
- Hotspot click fails to open the info panel or trigger navigation.
- Cloudinary image upload fails during the live admin demo.


# 7. Release Plan & Timeline


## 7.1 Build Window

Total Time Available: 24 hours
Team: 3 developers
Deployment Target: Firebase Hosting (live URL for demo)


## 7.2 Priority Tiers & Build Order

| Tier | Feature | Estimated Effort |
| --- | --- | --- |
| Tier 1 — Must Build | Firebase project setup (Auth, Firestore, Hosting) + Cloudinary account setup | 45–60 min |
| Tier 1 — Must Build | Firestore schema seeded with demo data | 30 min |
| Tier 1 — Must Build | Cloudinary upload utility + environment variable config | 30 min |
| Tier 1 — Must Build | 360° Pannellum viewer — dynamic room load | 1–2 hrs |
| Tier 1 — Must Build | Bottom navigation bar + GSAP animation | 1–2 hrs |
| Tier 1 — Must Build | Info & Navigation hotspot system | 2–3 hrs |
| Tier 1 — Must Build | Info side panel (GSAP slide-in) | 1 hr |
| Tier 1 — Must Build | Experimental 3DGS toggle + Three.js loader | 2–3 hrs |
| Tier 1 — Must Build | Admin Panel — Auth login page | 1 hr |
| Tier 1 — Must Build | Admin Panel — Dept & Room management + Cloudinary upload | 2–3 hrs |
| Tier 1 — Must Build | Admin Panel — Hotspot Editor (click-to-place) | 2 hrs |
| Tier 2 — Build If Time | Department filter dropdown | 1 hr |
| Tier 2 — Build If Time | Live search bar | 1 hr |
| Tier 2 — Build If Time | Auto Guided Tour Mode | 1–2 hrs |
| Tier 3 — Nice-to-Have | URL hash deep-linking | 30–60 min |



## 7.3 Dependencies & Risk Mitigations

| Dependency | Risk | Mitigation |
| --- | --- | --- |
| Cloudinary free tier limits | Upload/bandwidth quotas hit during demo | Use compressed 360° images; limit demo rooms to ≤10; Cloudinary free tier allows 25GB storage and 25GB bandwidth/month |
| Pannellum hotspot coordinate capture | Inaccurate click-to-pitch/yaw mapping | Test editor early; validate against live viewer |
| Three.js 3DGS scene loading | Large file size causes slow load or crash | Pre-load/cache scene; test on demo hardware |
| Cloudinary API credentials exposure | API secret leaked to client bundle | Use unsigned upload preset for client-side uploads; keep API secret server-side only |
| Cross-browser compatibility | Viewer breaks on non-Chrome browsers | Chrome is primary; test cross-browser only after Tier 1 complete |
| Multi-admin role config | Roles not configured in time | Single-role admin acceptable for demo; roles noted as TBD |



## 7.4 Future Enhancements (Post-Hackathon)

The following features are explicitly deferred to future development phases:
- Mini Map: Static floor plan image with clickable room indicators and active room highlight.
- Admin-Configurable Guided Tour Sequence: Admin defines the order of rooms in guided tour.
- Production Firebase Security Rules: Replace test mode rules with proper read/write restrictions.
- Cloudinary Transformation Pipeline: Auto-resize and optimise 360° images on upload for faster delivery.
- Mobile Responsive Design: Extend the platform to tablet and mobile viewports.
- Video/Audio Hotspot Media: Extend info hotspots beyond static images (Cloudinary supports video natively).
- Multi-institution Support: Generalise the platform for deployment across multiple campuses.


# 8. Constraints & Assumptions


## 8.1 Known Constraints

| Constraint | Detail |
| --- | --- |
| Time | Hard 24-hour build window; no extension |
| Team | 3 developers; no dedicated designer or QA |
| Platform | Desktop-only; no mobile support in scope |
| Security | Firebase test mode rules used for hackathon duration; Cloudinary unsigned preset used for uploads |
| No post-hackathon roadmap | This PRD is for the hackathon build only; no production evolution planned |
| Image format/size limits | Cloudinary accepts JPG/PNG/WebP; recommended max 50MB per 360° image for demo performance |
| Admin role definitions | TBD — role hierarchy not specified beyond 'multiple admins' |
| Pannellum image formats | Equirectangular required; JPG/PNG/WebP accepted (Cloudinary will auto-serve optimal format) |
| Cloudinary API secret | Must remain server-side only; never exposed in client bundle |



## 8.2 Explicit Assumptions

- Cloudinary free tier capacity is sufficient for the demo duration and number of rooms.
- An unsigned Cloudinary upload preset named `campusxr_upload` is configured in the Cloudinary dashboard before the build starts.
- Actual 3DGS content is pre-prepared and available at build start — not created during the 24-hour window.
- Demo hardware (laptop/desktop) meets Pannellum and Three.js rendering requirements.
- The university/college context is a single institution; multi-institution is out of scope.
- WCAG accessibility compliance is not required for this build.
- Chrome is the primary browser; cross-browser is best-effort secondary.
- URL hash deep-linking is implemented only if Tier 1 and Tier 2 features are complete.


## 8.3 Open Questions (TBD)

| Item | Question | Owner |
| --- | --- | --- |
| Image Format/Size | What 360° image formats (JPG/PNG/WebP) and maximum file sizes are acceptable for demo performance? | Dev Team |
| Cloudinary Upload Mode | Use unsigned preset (client-side) or signed upload via a backend function? | Dev Team |
| Cloudinary Folder Structure | How should images be organised in Cloudinary (e.g., `campusxr/rooms/`, `campusxr/hotspots/`)? | Dev Team |
| Admin Role Hierarchy | What specific roles and permissions are required (e.g., super-admin vs. editor)? | Dev Team |
| Guided Tour Interval | What is the default number of seconds between rooms in Auto Guided Tour Mode? | Dev Team |
| University Name | Should the institution name appear in the UI or remain generic for the demo? | Dev Team |
| Demo Room Count | How many departments and rooms will be seeded for the hackathon demo? | Dev Team |


# 8.4 Known Limitations (Hackathon v1)

The following are intentional design limitations for the 24-hour hackathon prototype. They are not bugs.

| Limitation | Description | Post-Hackathon Fix |
| --- | --- | --- |
| Cloudinary Asset Orphaning | When a room is deleted, the Firestore document is removed but the corresponding Cloudinary image (and any hotspot images) remain stored in the Cloudinary account as orphaned assets. This is because client-side deletion is not supported — Cloudinary asset deletion requires the `CLOUDINARY_API_SECRET`, which must stay server-side only. | Implement a Firebase Cloud Function triggered on room deletion that calls the Cloudinary Destroy API using the stored `imagePublicId`. |
| No Subcollection Cascade Delete | Firestore does not auto-delete subcollections when a parent document is deleted. The Admin Panel must explicitly delete all room documents in a department before deleting the department document. A partial failure can leave orphaned room records. | Use a Firebase Cloud Function or Firestore batch writes for atomic department deletion. |
| Firebase Test Mode Rules | Firestore is initialized in test mode (open read/write) for the hackathon duration. Not suitable for production. | Replace with scoped security rules restricting writes to authenticated admins. |


# 9. Appendices


## 9.1 Glossary of Terms

| Term | Definition |
| --- | --- |
| 360° Panorama | Equirectangular photographic image covering the full spherical field of view of a location |
| 3DGS / Gaussian Splatting | Neural rendering technique that reconstructs 3D scenes from photographs using Gaussian functions; rendered via Three.js |
| Pannellum | Open-source (MIT) lightweight JavaScript library for rendering 360° panoramic images with hotspot support |
| Firestore | Google Firebase's NoSQL cloud document database, used for storing campus hierarchy and hotspot data |
| Cloudinary | Cloud-based media storage and delivery platform; replaces Firebase Storage for all image and scene file hosting |
| secure_url | The HTTPS URL returned by Cloudinary after a successful upload; used as the imageURL value in Firestore |
| public_id | Cloudinary's unique identifier for an uploaded asset; used for deletion and management operations |
| Upload Preset | Cloudinary configuration profile that defines upload rules; unsigned presets allow client-side uploads without exposing the API secret |
| Firebase Auth | Google Firebase's authentication service, used for admin login and session management |
| Hotspot | An interactive clickable marker placed on a 360° panorama; either Info type (opens side panel) or Navigation type (loads another room) |
| GSAP | GreenSock Animation Platform — JavaScript animation library used for UI transitions |
| Pitch | Vertical angle of a hotspot's position within a panorama (up/down) |
| Yaw | Horizontal angle of a hotspot's position within a panorama (left/right) |
| Equirectangular | A standard 2:1 aspect ratio projection format for 360° panoramic images |
| Hierarchical Navigation | The three-tier navigation structure: Campus → Department → Room |
| Admin Panel | Password-protected web interface for authorised users to manage platform content |
| PRD | Product Requirements Document — the authoritative specification for the product build |



## 9.2 Source Reference

This PRD was derived exclusively from the following source document:
- CampusXR - raw facts.txt (provided by development team, February 2026)

All feature names, technology choices, data schema fields, UI layout descriptions, animation choices, and priority tiers are traced directly to the raw facts file. Clarifications provided by the development team on February 28, 2026 are incorporated and noted where they resolve ambiguities from the source.

v1.1 update (March 2026): File storage migrated from Firebase Storage to Cloudinary. All references updated accordingly.


## 9.3 Document Control

| Field | Value |
| --- | --- |
| Document Title | CampusXR Product Requirements Document |
| Version | 1.3 |
| Status | Updated — Firebase Storage → Cloudinary Migration |
| Owner | CampusXR Development Team (3 members) |
| Audience | Internal — Development Team Only |
| Created | February 28, 2026 |
| Last Updated | March 4, 2026 |
| Next Review | N/A — Hackathon prototype; no scheduled review cycle |
