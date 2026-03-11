---
description: 'React and component conventions for CampusXR'
applyTo: 'src/**/*.jsx, src/**/*.js'
---

# React Conventions

## Components
- Functional components only — no class components
- One component per file; filename matches component name (PascalCase)
- Place in the correct `src/components/` subdirectory:
  - `viewer/` — Three.js panorama / 3D viewers
  - `ui/` — standalone glass UI widgets
  - `layout/` — composition / slot wrappers
  - `admin/` — admin-only guards and wrappers

## Imports
- Firebase: always from `src/config/firebase.js`
- Cloudinary upload: always from `src/services/cloudinaryService.js`
- Glass design tokens: always from `src/constants/glassTokens.js`
- Firestore operations: always from `src/services/firestoreService.js`

## State & Hooks
- Extract multi-effect data fetching into `src/hooks/` as custom hooks
- Custom hook files: camelCase with `use` prefix (e.g., `useTourData.js`)
- Co-locate UI-only state with the component that owns it

## Styling
- Inline styles for glass morphism tokens (do NOT use Tailwind for glass tokens)
- Tailwind for layout, spacing, and general utility classes
- Never duplicate glass token values inline — import from `glassTokens.js`

## Anti-patterns
- No direct Firestore / Firebase SDK calls inside components
- No inline glass CSS constants that duplicate `glassTokens.js`
- No new files at `src/` root — always use the appropriate subdirectory
