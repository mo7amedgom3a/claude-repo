# Design-system kit goes here

Copy the Mastery Academy design-system kit into this folder:

- `fonts.css`, `tokens.css`, `components.css`, `tokens.json`
- `sprite.svg` (provides `#ma-logo`, `#ma-mark` and icons)
- `assets/logos/*.svg`, `assets/fonts/*.woff2`

`index.html` already links `fonts.css` and `tokens.css`, and `admin/js/main.js` inlines
`sprite.svg` at startup. Until the kit is here the prototype runs on placeholder
fallback tokens defined in `admin/css/admin.css` (inside `@layer fallback`), which the
kit's unlayered `tokens.css` overrides automatically.
