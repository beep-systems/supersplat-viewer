# VoluScape source extensions

The voluscape branch merges upstream release tags. origin is beep-systems/supersplat-viewer; upstream is playcanvas/supersplat-viewer.

Use Node.js 24.14.1 and npm 11.11.0, npm ci, npm run type:check, npm run lint, npm run fmt, npm run build, npm run test:unit.

Source modules implement dynamic world-space framing and full-geometry clipping, delegated point interaction and picking, marker primitives and Fly mouse inversion. The public types are exported from the viewer entry. UI and marker ownership are in VoluScape.

Update using the VoluScape viewer/scripts/update-vendor.mjs CLI with an explicit release tag. Conflicts stop before vendor installation. Never patch generated JavaScript.
