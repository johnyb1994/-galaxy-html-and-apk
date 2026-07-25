# Galaxy Outlast

A **Progressive Web App (PWA)** space shooter game built with HTML5 Canvas and React. Defend the galaxy across 30 waves, defeat 10 bosses, collect power gems, and upgrade your ship.

## Features

- **Canvas-based arcade shooter** — drag-to-move controls optimized for mobile
- **30 waves + boss fights** — progressive difficulty, boss every 3 waves
- **Level-up & equipment system** — collect XP gems, choose upgrades (weapons, shields, speed, etc.)
- **Persistent high scores & achievements** — saved via `localStorage`
- **Full PWA offline support** — play offline after first load
- **Mobile-first portrait design** — responsive UI with `clamp()` viewport units
- **Rich UI overlays** — start, pause, settings, lore, upgrade, scoreboard, game over, victory screens
- **Individual sound toggles** — per-effect volume control

## Technologies

- HTML5 Canvas (game rendering)
- React 19 (UI overlays)
- Tailwind CSS v4.3.0 (styling)
- PWA (Manifest V3 + Service Worker)
- Google Fonts: Cinzel Decorative, Cinzel, Outfit

## Usage

1. Serve the directory with any static HTTP server:
   ```
   npx serve .
   ```
2. Open the app in a browser.
3. For offline use, install as a PWA from the browser menu.

## Project Structure

- `galaxy_outlast last.html` — the entire game (HTML, CSS, JS, assets) in one file
- `sw.js` — service worker for offline caching
- `manifest_v3.json` — PWA manifest
- `icon_v3.png` / `galaxy outlast app icon.png` — app icons

## License

MIT
