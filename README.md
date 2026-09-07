# Mohsen — coastal portfolio

A React / Three.js portfolio with a navigable coastal landscape. The `hq` redesign keeps the artist, bakery, resume, contact destinations, and optional ambient audio, and replaces the landscape and presentation.

## Run locally

```sh
npm install
npm run dev
```

If the preview does not update after source edits on a mounted or sandboxed filesystem, use `CHOKIDAR_USEPOLLING=true npm run dev`.

```sh
npm run build
npm run preview
```

## The HQ scene

- `public/coast-hq.glb`: the new landscape. In Blender, use **File → Import → glTF 2.0**. It contains the coast, limestone paving, terraces, vegetation, lighthouse, lanterns, and hilltop citadel.
- `src/experience/buildCoast.js`: deterministic authoring code for the landscape. It merges static objects by material into 27 meshes / 39,100 triangles.
- `src/experience/coastLayout.js`: shared path and project terrace coordinates.
- `scripts/export-coast.mjs`: regenerate the GLB with `npm run models:coast`. Rebuilding replaces the generated GLB; keep a separate copy if editing it manually in Blender.
- `public/Try1.glb`: preserved original scene. The singer, bakery, and bench are reused from it and positioned on the new terraces by `CoastalWorld.jsx`.
- `Ocean.jsx`, `CoastalMist.jsx`, and `SkyDome.jsx`: animated ocean, local mist banks, and sky. These runtime effects are not baked into the GLB.
- `constants.js` and `CameraRig.jsx`: the four-stop camera tour.

The new asset is about 2.8 MB. The original asset remains about 6.2 MB. Desktop uses ambient occlusion, bloom, tone mapping, and a static shadow bake. Small/coarse-pointer devices omit postprocessing and shadow maps. The site is still a stylized real-time scene; it is not an offline Blender render of the reference image.

## Navigation and accessibility

- Scroll or swipe to move between the coast and the three projects.
- Click a landmark, a chapter marker, or the Explore button to choose a stop.
- Arrow Up/Down and Page Up/Down move between stops; Home/End select the first/last stop.
- OS reduced-motion preference disables the camera fly-through, parallax, ocean/mist motion, and text reveal animation.
- Music is off until the visitor explicitly enables it.
- If the 3D scene fails, a fallback exposes the resume, project links, and contact address.

## Validation

`npm run models:coast` checks geometry coordinates while exporting. `npm run build` creates the production bundle. The desktop tour, project links, and a narrow viewport can be reviewed in the local preview. No site deployment is configured or performed by this redesign.
