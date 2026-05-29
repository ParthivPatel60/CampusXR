---
agent: 'agent'
description: 'Scaffold a new CampusXR React component with glass design tokens'
---

Create a new React component for CampusXR named `${input:componentName}` in the `${input:directory}` directory (e.g., `src/components/ui/`).

Requirements:
- Functional component, default export
- Import any glass design tokens needed from `../../constants/glassTokens` (adjust relative path as needed)
- Follow VisionOS glassmorphism style using GLASS_BG, GLASS_SHADOW, GLASS_BLUR from glassTokens
- Montserrat font, 8px spacing grid
- Include a JSDoc header comment describing the component purpose and props
- No inline duplication of glass token values
