
# CampusXR

A web-based platform for immersive, interactive 360° campus tours with an admin panel. Built with React + Vite, featuring Three.js-based panorama viewing, Firebase backend, and Cloudinary media hosting.

---

## Features

- **360° Panoramic Campus Tours**: Explore campus spaces virtually.
- **Experimental 3DGS Mode**: Next-gen neural rendering (Gaussian Splatting).
- **Admin Panel**: Secure, password-protected editing of rooms, hotspots, and media.
- **Accessibility**: Designed for remote and mobility-impaired users.
- **Modern UI**: VisionOS-inspired glassmorphism, responsive design.

## Tech Stack

- React 19, Vite 7, Three.js (custom renderer)
- Firebase (Firestore, Auth, Hosting)
- Cloudinary (media CDN, uploads)
- Tailwind CSS v4, GSAP, React Router v7

## Quick Start

1. **Install dependencies**
   ```
   npm install
   ```
2. **Configure environment variables**
   ```
   cp .env.example .env
   ```
   Open `.env` and fill in your Firebase project credentials (API key, project ID, etc.).
3. **Run development server**
   ```
   npm run dev
   ```
4. **Build for production**
   ```
   npm run build
   ```

## Seeding Firestore / Cloudinary

For initial setup and media upload:
```
npm run seed:install   # Install scripts/ deps (first time only)
npm run seed           # Upload images & write Firestore metadata
npm run seed:dry       # Dry-run (no writes)
```

## Project Structure

- `src/` — App source code
  - `components/` — UI, layout, admin, and viewer components
  - `config/` — Firebase & Cloudinary config
  - `constants/` — Shared design tokens (glassTokens.js)
  - `hooks/` — Custom React hooks
  - `pages/` — Route-level pages (UserTourPage, AdminPanel, etc.)
  - `services/` — Firestore and Cloudinary service logic
- `scripts/` — Firestore/Cloudinary seed utilities (standalone npm workspace)
- `public/` — Static assets
- `docs/` — Architecture, API, and design documentation

## Data Model

Firestore:  
`departments/{deptId}/rooms/{roomId}/hotspots/{hotspotId}`  
- **Rooms**: `name`, `imageURL`, `imagePublicId`, `sortOrder`
- **Hotspots**: `type`, `pitch`, `yaw`, `text`, `description`, `targetRoomId`, `targetDeptId`

## Code Standards

- Functional React components only
- Use hooks for state/data logic
- Import shared tokens from `src/constants/glassTokens.js`
- All Firestore ops via `src/services/firestoreService.js`
- Lint before commit: `npm run lint`

## Documentation

- See `docs/architecture.md` for system design
- See `docs/api.md` for API details
- See `docs/PRD.md` for product requirements

## License

Internal hackathon project — not for production use.