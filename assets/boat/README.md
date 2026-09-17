# Coastal entrance sailboat

Source: the user-supplied `boat.usdz`, moved here from `assets/woodsign/`.

`boat-web.glb` is an intermediate export with the original 14,846 triangles and UVs. The nested USD hierarchy and unused material/light data are removed, the hull is centered, and its lowest point is grounded at local Y=0. No geometry simplification is used.

Runtime assets in `public/optimized/boat/` total 550,866 bytes, versus 4,499,112 bytes for the supplied USDZ (88% smaller). Geometry uses lossless Meshopt compression, checked byte-for-byte. Color is 1024px WebP; normal and roughness are 512px WebP. The largely wooden model uses a nonmetallic material. The original source remains intact for future higher-resolution exports.

Rebuild:

1. Blender `--background --factory-startup --python scripts/export-boat.py`
2. `node scripts/optimize-boat.mjs` (requires cwebp)
3. `node --test tests/boat.test.mjs`

Placement is in `src/experience/boatMotion.js`. The boat sits just offshore beside the first paving slab. Four wave samples drive its waterline, pitch and roll using the ocean's animation clock. Reduced motion freezes both water and boat together. A small hull-shaped exclusion in the water shader keeps waves from rendering through the open deck. It adds one mesh/material, participates in the existing sea reflection and lighting, and adds no lights or animated shadow maps.
