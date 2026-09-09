# Mohsen — coastal portfolio

A React / Three.js portfolio with a navigable coastal landscape, developed on `hq`.

## Run locally

```sh
npm install
npm run dev
```

For a production preview:

```sh
npm run build
npm run preview
```

## Scene and lighting

- `public/optimized/coast.glb` is the runtime landscape, losslessly compressed from `public/coast-lit.glb`. It contains fitted, bevelled paving, substantial terraces, folded foliage, pines, cliffs, a lighthouse, lanterns, and a hilltop destination.
- `public/optimized/*.webp` are lossless copies of the linear RGBM8 irradiance atlases in `public/lighting/*.png`, baked in Blender Cycles. They retain sunlight, soft shadows, indirect bounce, and the surrounding glow from all 20 lamps. Their alpha channel encodes intensity; do not process them as ordinary transparent pictures.
- `assets/coast-lighting.blend` is the editable lighting scene. Earlier scenes are preserved in the file; the active HQ scene is the latest bake.
- `assets/coast-source.glb` is the generated geometry before UV unwrapping and lighting. `src/experience/buildCoast.js` and `coastLayout.js` author it deterministically (29 material groups, 22,108 triangles).
- `public/Try1.glb` preserves the original models. Only the featured singer, bakery, and bench are extracted into `public/optimized/subjects.glb` and loaded by `CoastalWorld.jsx`. The singer's fabric receives a selective ivory color treatment at runtime.
- `Ocean.jsx` reflects the actual scene into animated water. Its normal texture is generated locally. `SkyDome.jsx` and `CoastalMist.jsx` provide the atmosphere.
- `TourFocus.jsx` starts surrounding dimming as the zoom begins; spotlight/dust fade in only within 4 world units of the destination camera view. Only the caption waits for camera arrival. `WorldFocus.jsx` dims baked and live illumination, sky, mist, water, and the page overlay while leaving the stage spotlight bright. Surroundings stay dark through project exits and travel; daylight returns only when navigating back to the coast. `npm run test:focus` checks this sequence and reduced-motion behavior. `SceneFocus.jsx` consumes that state to draw a warm spotlight, soft platform pool, and 80 floating dust motes on the selected project. The beam fades gradually before its upper end and along its silhouette, and the upper dust fades with it. One reusable light and particle buffer serve all three stops, with no extra shadow maps or downloaded assets.
- Desktop uses live specular lighting, ambient occlusion, subtle bloom, depth of field, and filmic tone mapping. Six nearby lights provide moving specular highlights; every lantern retains its baked illumination regardless of that budget.
- Phones retain the baked illumination and lower-resolution water reflections, while omitting the desktop postprocessing and large shadow maps. A narrow desktop window retains desktop rendering quality.

The runtime lighting textures total 7.04 MB, the landscape 1.47 MB, and the featured models 3.54 MB (decimal MB). Original exports and PNGs stay available locally and are excluded from the production build. Raw EXR bake intermediates live in `assets/lighting/` and are excluded from Git and the production build.

## Rebuild the landscape

1. Run `npm run models:coast` to regenerate `assets/coast-source.glb`, the shared `assets/coast-layout.json`, and `assets/placement-audit.json`.
2. In Blender's Python Console, execute `scripts/bake-coast.py` using its absolute path. The script creates a separate scene, imports the authored geometry and featured models, unwraps the meshes, and bakes three HDR atlases. It preserves existing scenes. Status is written to `assets/bake-status.json`; wait for `Complete`.
3. Run `npm run models:lighting` to filter, downsample, and encode the EXRs, then generate the lossless runtime assets. This requires the `cwebp` command from libwebp (on macOS: `brew install webp`). If only the GLBs or existing PNGs change, run `npm run models:optimize` directly.
4. Run `npm run build` and review all camera stops in the browser.

The visible lamp glass is hidden during baking so it cannot block the light source inside it. Paving and terrace coordinates must remain aligned with the featured models. Regenerating the source replaces generated geometry; keep manual Blender edits in a separate scene/file if you intend to retain them.

`CoastalWorld.jsx` applies the web exposure and sky-fill calibration separately from the baked transport and keeps live specular response. `constants.js` and `CameraRig.jsx` control the four-stop tour.

## Navigation and accessibility

- Scroll or swipe to move between the coast and the three projects.
- Click a landmark, chapter marker, or Explore button to select a stop.
- Arrow Up/Down and Page Up/Down move between stops; Home/End select the first/last stop.
- Reduced-motion preference disables the camera fly-through, parallax, water/mist motion, and text reveals.
- Music starts only when the visitor enables it.
- If 3D cannot load, a fallback exposes the resume, projects, and contact links.

No deployment is configured or performed by this redesign.

## Performance pass — September 2026

The appearance, geometry, texture resolutions, camera motion, shadow resolution, reflection resolution, and postprocessing quality are preserved.

| Scene download | Before | After |
| --- | ---: | ---: |
| Featured model source | 6.47 MB | 3.54 MB |
| Landscape | 3.01 MB | 1.77 MB |
| Irradiance textures | 10.81 MB | 7.40 MB |
| Total | 20.29 MB | 12.71 MB |

The scene payload is 37.4% smaller. The initial UI JavaScript is approximately 277 KB instead of 1,504 KB (uncompressed); the 3D engine loads separately. Phones also skip the approximately 242 KB desktop effects chunk. All five scene assets begin loading concurrently.

`models:optimize` uses meshoptimizer without quantization or geometry simplification and checks decoded geometry buffers byte-for-byte. Lossless WebP preserves all RGBM channels, including transparent RGB values. The three WebPs were independently decoded and compared against the PNGs: every RGBA pixel and dimension matched. The runtime glTF decoder was also checked against both generated models.

The lighting textures use linear filtering, so their unused mipmap chains are disabled, avoiding approximately 10.1 MB of texture storage. Extracting only the three used models avoids parsing 131 unused meshes and decoding three unused images (12.6 million pixels). Static landscape matrices, motion preferences, and nearest-lantern buffers are reused. Only a focused showcase updates its world transforms while rotating. Navigation components subscribe only to the displayed state; hidden hero text no longer rerenders throughout the tour. The desktop canvas avoids a redundant MSAA framebuffer while retaining the composer's 4× MSAA. Fully transparent mist pixels exit before noise calculations, and rendering pauses when the page is hidden.

Validation used production builds and the in-app browser, including all four desktop stops at 1440×900. The baseline hero and optimized desktop stops sustained approximately 60 fps; these measurements do not establish an FPS increase or predict performance on every device. The 390×844 phone-mode preview also rendered successfully, with no desktop effects chunk in its resource log. This is browser emulation, not a physical-phone benchmark. The confirmed gains are the reduced payload, avoided allocations, and removed redundant work. Temporary profiling instrumentation is removed from the delivered application.

### Spotlight preset

`src/experience/spotlightSettings.js` contains the approved singer preset, shared by all three projects. Light position and aim remain relative to each project's terrace. The editor and browser-saved overrides are removed; the same settings apply to every visitor. Scene darkening begins with the first project zoom and persists between projects. Only returning to the initial coast view restores daylight. Each spotlight fades in near its final camera view.

`node --test tests/*.test.mjs` checks the bounded camera finish and proximity-based focus sequence at 30, 60, and 120 fps.

The opening screen stays visible until the scene is ready and the visitor selects Enter. This click starts music directly and reveals the portfolio; navigation stays inactive behind the screen. The music button remains available afterward. Muting is respected for the rest of the visit; background tabs pause and resume playback. Both sound layers start within the same gesture and the optional nature track cannot block the main song. Focused projects rotate at the original 0.4 radians/second, fading in with their spotlight; reduced-motion preference disables rotation. The existing sun shadow refreshes at most 15 times/second while a model rotates and freezes again afterward.

Four tiny insect dots wander around each lantern bulb, using one shared points draw with static buffers and shader animation. They stay subtle in daylight, become slightly clearer in the dark, fade into the distance, and pause under reduced motion. No new assets or lights are loaded.

Clicking a numbered marker, project label, or other absolute destination takes one direct camera flight from the current pose to that view. Intervening projects are not visited or highlighted. Wheel/swipe navigation still follows the sequential coastal path, with the same bounded arrival easing.

### Grounding and placement

Terrace skirts stay at least half a metre outside the road, with short stone approaches and continuous retaining foundations. The same resolved landmark coordinates drive the models, focus cameras, labels, spotlights, and baked subject shadows. Terrain and outcrops leave space beneath walking surfaces, and a continuous retaining base supports the paving on sloping ground. Vegetation is planted by raycasting the actual terrain and rock triangles; steep faces and road, terrace, and approach clearances are excluded. Lantern sockets connect to the road edge and have footings extending into the sampled ground. The lighthouse and citadel have fitted foundations and the castle has an unobstructed entrance.

`node --test tests/placement.test.mjs` checks all terrace boundaries, samples finished terrain and rock geometry across the road and stages, and checks vegetation roots and lantern support. These checks run during development; the browser continues loading the prebuilt, merged landscape.

The placement pass was checked in the browser at the coast and all three focused views, and all 25 automated checks pass. The rebuilt landscape and irradiance assets total 8.51 MB; lighting sample counts, atlas dimensions, and runtime effect settings are unchanged.
