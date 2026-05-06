# scripts/

## build_sprite_sheets.mjs

Bakes idle-animation sprite sheets from `assets/sprites/class_sprites.html`
(the canonical procedural sprite library) into PNG files under
`assets/sprites/sheets/`.

### Run

```
npm install
node scripts/build_sprite_sheets.mjs
```

### Output

- `assets/sprites/sheets/<ClassName>.png` — one horizontal strip per class.
  - 8 frames, each 200×220 px → strip is 1600×220 px, RGBA.
  - Frames sample one full breath cycle (`breathe = sin(time*2)*0.5`,
    period = π seconds).
- `assets/sprites/sheets/manifest.json` — frame size, frame count, breath
  formula, per-sheet byte sizes.

### Notes

- The viewer's runtime ground-shadow ellipse is **not** baked into the PNGs;
  the game should draw the shadow dynamically at the sprite's foot position.
- Only the **idle** state is bakeable today — `CLASS_SPRITES` doesn't yet
  define wind-up / impact / hit-react / death draw functions. Add those to
  `class_sprites.html` and extend this script to sweep additional states.
- 42 classes are currently defined in `CLASS_SPRITES`.
