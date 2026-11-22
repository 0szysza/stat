# Development

Use Node 24. Run `npm ci --ignore-scripts`, `npm run check`, then `npm run build`. Publish `_site/` only. Pull requests run checks/build; pushes to main/manual runs publish through GitHub Pages. The build versions local assets and module imports by content. The short public README format is intentional.

Hatches remains the default. Hatches/Bubble/Rebirth domain calculations, saved timestamp semantics and separate local storage remain unchanged. `app.js` controls those views; `restock.js` controls Restock Time. Their date selection and numeric stepping now use shared `date-picker.mjs` and `number-controls.mjs`; calculation/amount models stay independent of the DOM and covered by existing tests.

A restock day means 24 elapsed hours, including across daylight saving changes. Hour/minute fields are bounded and invalid countdowns do not produce a forecast. Calendars support keyboard day navigation; month navigation retains focus. Avoid making a once-per-second result region live-announced: only validation messages use a live status.

The existing card layout, navigation and colors are retained with quieter shadows and hover behavior. Discord contact copies the username instead of constructing an invalid profile URL. No framework, backend or account system was added.
