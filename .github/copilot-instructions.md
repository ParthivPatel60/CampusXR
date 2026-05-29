# CampusXR

## Overview
Web-based hybrid virtual tour platform for university campus exploration. Provides immersive 360° panoramic views with experimental Gaussian Splatting (3DGS) mode. Features a public-facing tour and a password-protected admin panel.

## Tech Stack
- React 19 + Vite 7
- Three.js (custom panorama sphere renderer — no Pannellum)
- GSAP + @gsap/react (UI animations)
- Firebase (Firestore data, Auth, Hosting)
- Cloudinary (media CDN, image uploads via unsigned preset)
- Tailwind CSS v4
- React Router v7

## Project Structure
- `src/config/` — Firebase + Cloudinary service configuration
- `src/constants/` — Shared design tokens (`glassTokens.js`)
- `src/hooks/` — Custom React hooks (`useTourData`)
- `src/services/` — Firestore CRUD + Cloudinary upload service
- `src/components/viewer/` — Three.js panorama viewers
- `src/components/ui/` — Glass UI components (navbar, side controls, markers)
- `src/components/layout/` — Composition/slot wrappers
- `src/components/admin/` — Admin auth guard only
- `src/pages/` — Route-level pages
- `scripts/` — Standalone Node.js seed script (separate npm workspace)

## Data Model
Firestore hierarchy: `departments/{deptId}/rooms/{roomId}/hotspots/{hotspotId}`
- Rooms: `name`, `imageURL` (Cloudinary secure_url), `imagePublicId`, `sortOrder`
- Hotspots: `type` (info|navigation), `pitch`, `yaw`, `text`, `description`, optional `targetRoomId` / `targetDeptId`

## Design System
VisionOS-inspired glassmorphism. All shared tokens live in `src/constants/glassTokens.js`:
- Glass BG: `linear-gradient(247.52deg, rgba(108,99,255,0.17) 1.52%, ...)`
- Shadow: `inset -2px -2px 100px rgba(255,255,255,0.1), inset 2px 2px ...`
- Blur: `blur(25px)`
- Typography: Montserrat, 8px grid
- Accent indigo: `rgb(108,99,255)`

## Code Standards
- Functional components only, hooks for stateful/data-fetching logic
- Import glass tokens from `src/constants/glassTokens.js` — never duplicate inline
- Import Firebase from `src/config/firebase.js`
- Import Cloudinary upload from `src/services/cloudinaryService.js`
- All Firestore operations go through `src/services/firestoreService.js`
- Run `npm run lint` before committing

## Do Not
- Add third-party 3D libraries without team discussion (Three.js is the standard)
- Duplicate glass CSS token values inline — always import from `glassTokens.js`
- Call Firestore SDK directly from components — always use `firestoreService.js`
- Add a backend server — fully client-side on Firebase Hosting
- Create new files at `src/` root — use the appropriate subdirectory
