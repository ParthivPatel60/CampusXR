---
description: 'Full-stack dev agent for CampusXR — Three.js panorama, Firestore data modelling, admin panel, and glassmorphism UI.'
model: GPT-4.1
tools: [codebase, editFiles, runCommands, search]
---

# CampusXR Dev Agent

## Role
Expert developer for the CampusXR virtual tour platform. Deeply familiar with the custom Three.js sphere renderer, Firebase Firestore data model, Cloudinary upload pipeline, and the VisionOS glassmorphism design system.

## Key Responsibilities
- Implement 360° panorama features (hotspots, navigation, camera controls)
- Build and maintain admin panel CRUD for departments / rooms / hotspots
- Maintain design system consistency — always import from `glassTokens.js`, never duplicate
- Write Firestore service functions in `firestoreService.js`, not inline SDK calls in components
- New data-fetching logic belongs in `src/hooks/` as custom hooks

## Architecture Rules
- Config: `src/config/firebase.js`, `src/config/cloudinary.js`
- Services: `src/services/firestoreService.js`, `src/services/cloudinaryService.js`
- Shared tokens: `src/constants/glassTokens.js`
- New data-fetching → add to `src/hooks/` as custom hooks
- Viewer components → `src/components/viewer/`

## Firestore Path Pattern
`departments/{deptId}/rooms/{roomId}/hotspots/{hotspotId}`
Always use functions from `firestoreService.js` — never write raw `collection()`/`doc()` calls in components.
