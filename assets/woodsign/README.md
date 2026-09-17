# Plain wood coast signs

`normal.fbx` is the supplied 32-vertex sign. The web export retains its three irregular planks and post, with planar faces for painted text. Matching arrow and two-direction variants are derived in `scripts/export-signs.py`. The embedded light is omitted.

All three variants share `public/optimized/signs/woodsign.glb` (about 12 KB). There are no downloaded textures. A matte wood material with subtle plank color variation responds to the existing scene lights; cream lettering is generated in a small canvas atlas. All seven fixed signs are merged into three draw meshes. The interactive Templates board retains its original parchment-and-wood design.

The coast welcome, North Cove and horizon use plain signs. The road junction has Castle and Templates arrows on one post. The separate Ekaterina and collection-approach arrow signs are omitted. Each project terrace has a smaller name/year sign beside its steps, including Bavo Bakes. Project text is read from `src/experience/projects.js`.

## Rebuild

- Blender: `--background --factory-startup --python scripts/export-signs.py`
- Grounded placements: `node scripts/place-signs.mjs`
- Checks: `node --test tests/signs.test.mjs`

Placement probes the shipped terrain and limestone platforms, clears lamps, foliage and paths, and verifies arrow directions. Source files in `assets/signs/` are archived; their older model and textures are removed from public assets.
