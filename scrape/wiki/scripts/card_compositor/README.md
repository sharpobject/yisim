# Shared wiki card components

The public wiki composes card faces from shared texture layers and prerendered
TMP glyphs. `cards.js` preserves ordinary `img` elements, so dimensions, alt
text, hover, cropped fate artwork, and saving a full-resolution static image continue
to work. Rendering runs in an OffscreenCanvas worker when available; the main
thread has a canvas fallback. Recipes and sprites load lazily. Unused completed faces
and decoded sprites have bounded caches.

## Generation

Run from the authoritative Hetz checkout, after generating/copying the ordinary
wiki and its card signature JSONs:

```
python3 scrape/wiki/scripts/card_compositor/build.py /path/to/public/wiki
```

`--legacy webp` is the default: preserve the WebP hotlinks now used by external sites, and remove
the obsolete full-face PNG aliases.
`--legacy none` retires those legacy images too. `--legacy all` is useful for a
private comparison. Existing card signature JSONs remain available as source
metadata. The two legacy Doom Calamity signatures were recovered from the
published July 12 extraction. The publisher passes `--asset-root` to preserve
its chosen sigil configuration source.

The existing publisher calls this after its compatibility-alias step. Recording
staging reads `assets/card-components/active.json` to insert the correct loader.
Changing Clear Heart backgrounds requires rerunning this generation step;
changing only runtime Clear Heart rules does not. The existing dynamic rules
SVG/glyph renderer remains in place above the composed blank-rule background.

Use the current authoritative `scrape/render_rule_sky_sword_formation.py` and
its extracted textures/fonts. That renderer has pre-existing pending changes in
the main Hetz checkout; this change deliberately does not import those unrelated
changes into the source publication worktree. The integration patch records the
small edits to other pre-existing, untracked wiki generator files.

## Pipeline and representation

* `export.py` reads each face's published signature, preserving its configuration
  and localized strings. It traces the existing renderer, rather than using
  browser fonts or introducing another text layout algorithm.
* `extras.py` covers sigils and all dynamic Clear Heart backgrounds.
* `verify.py` reconstructs every trace and compares it with the original bitmap.
  Unexpected differences fail the build. Transparent RGB is ignored.
* `bake.py` evaluates fixed resampling once at generation time and crops/deduplicates
  the resulting layers. Text layers remain lossless. This trades some per-glyph
  sharing for much cheaper browser compositing; frames and component layers still
  share across faces. The baked scenes pass the same full-reference verification.
* `pack.py` deduplicates textures by pixels and packs lossless glyphs by card
  family/language. Small family atlases avoid fetching large unrelated font
  sheets for a single card. Texture layers use the existing WebP quality 92,
  or lossless when smaller. Glyphs always remain lossless.
* `stage.py` installs a content-versioned bundle and rewrites static image tags.
  Dynamic recording and tier-list consumers use `YxpCards.source/sourceUrl`.

Recipes are gzip-compressed JSON, using the same native DecompressionStream
capability already used by the recording browser. Each recipe contains sprite
rectangles `s` and a draw graph `n`. Operations are image (`i`), clipped group
(`g`), native resample/shift (`t`), horizontal flip (`x`), and fusion mask (`m`).
`resample.js` implements the wiki renderer's Magic Kernel / Sharp 2021 filtering.
Image layers reuse decoded sprites; titles, numeric costs, and rules retain
native SDF glyph pixels and their existing positions.

Dream is only a horizontal art transform. Artwork deduplication spans all card
categories and source builds, including horse-event cards. Fusion retains its
two original art layers, native masks, and divider. Native watermark precedence
is sect, side job, artifact, spiritual pet, otherwise none; Dream omits the mark.
The exporter restores the artifact/pet cases missing from the old wiki helper.

## Validation and tradeoffs

First export: 6,326 faces (5,504 ordinary/event faces, 794 sigils, 28 dynamic
backgrounds). All regular traces and dynamic backgrounds reconstruct exactly;
sigil differences remain below 0.01 average channel levels out of 255. Browser
sampling additionally checks the JS filters and final packed assets.

A compatibility bitmap is intentionally still stored for existing WebP
hotlinks. Shared components reduce current wiki transfers and remove the second
full-face copy. Cold single-card visits can be slightly larger than one old
bitmap; card levels, decks, and subsequent navigation benefit from shared
frames and artwork. Report measured page examples separately from storage
savings. This migration does not shrink historical Git objects.

Browser loading permits eight concurrent card jobs instead of serializing all
recipe and sprite fetches behind two jobs. Production recipes have no runtime
resampling nodes; the browser only composites prepared layers.

Completed faces also use a best-effort Cache Storage cache, bounded to 192
entries and invalidated by bundle version. Repeated page visits can reuse full
rendered pixels without recipe loading/composition; unavailable storage falls
back to ordinary rendering. Existing external WebP targets are unchanged.
