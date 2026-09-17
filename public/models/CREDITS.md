# 3D model credits

All meshes under `public/models/` are CC0 1.0 (public domain). Attribution is not required by the licenses; it is given here with thanks. Each pack's original `License.txt` sits next to its files.

| Folder | Pack | Author | License | Source |
| --- | --- | --- | --- | --- |
| `kenney/td.glb` | Tower Defense Kit 2.1 | Kenney (www.kenney.nl) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://kenney.nl/assets/tower-defense-kit |
| `nature/props.glb` | Nature Kit 2.1 | Kenney (www.kenney.nl) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://kenney.nl/assets/nature-kit |
| `quaternius/*.glb` | Ultimate Monsters | Quaternius (quaternius.com) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | https://quaternius.com/packs/ultimatemonsters.html |

## What is inside

- `kenney/td.glb`: one scene, one shared palette texture. Root nodes are named after the kit files (`weapon-turret`, `tower-round-bottom-a`, `spawn-round`, ...). Towers are stacked from these parts by `src/game/world3d/assets.ts`; the palette is recolored to the Tower swatch at runtime.
- `nature/props.glb`: 21 props (`rock_largeA`, `tree_pineTallA`, `plant_bush`, ...). Material colors were baked into vertex colors and each prop collapsed to one primitive so it can be drawn with `InstancedMesh`.
- `quaternius/<Monster>.glb`: rigged Enemies with only `Walk`/`Run` (or `Fast_Flying`), `Idle`, `Death`, and `HitReact` clips kept. Creep Orc, Runner Ninja, Brute Yeti, Swarm GreenSpikyBlob, Warden Orc_Skull, Shade Ghost, Colossus Demon, Overlord BlueDemon.

## Pipeline

Built with `@gltf-transform` 4.5 and `meshoptimizer`: merge parts into one document, drop unused animation clips, `prune`, `dedup`, `weld`, `resample`, resize palette textures to 256 px, `quantize`, then `EXT_meshopt_compression` (medium). Total payload is about 2.4 MB. Decoding uses `three/addons/libs/meshopt_decoder.module.js`; no external decoder files are needed.
