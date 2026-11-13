# Natural winter Santa

The textured head and beard are extracted from Grab3D's Wizard; the bent cap geometry is adapted from Grab3D's Santa Hat. Both sources are dedicated by their publisher to the public domain under CC0 1.0. Original publisher licenses and manifests are preserved beside this file.

| Source       | Publisher                                    | Download                                      | SHA-256                                                            |
| ------------ | -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Wizard light | https://grab3d.com/models/characters/wizard/ | https://grab3d.com/dl/wizard/wizard-light.glb | `6a8242b2eda14a3611d3bca09ddeee120cc4cedb19c8f0741535aa9e220e2df6` |
| Santa Hat    | https://grab3d.com/models/props/santa-hat/   | https://grab3d.com/dl/santa-hat/santa-hat.glb | `9af195ed9b898256abc836ce0ac4b206d9192d86edc04acdc44df42f19d1c5fb` |

Publisher records: [Wizard license](natural-santa-wizard-LICENSE.txt), [Wizard manifest](natural-santa-wizard-manifest.json), [Santa Hat license](natural-santa-hat-LICENSE.txt), [Santa Hat manifest](natural-santa-hat-manifest.json). Original records are available as `LICENSE.txt` and `manifest.json` in each download directory above.

Run `node scripts/prepare-natural-santa.cjs <local-wizard-light.glb> <local-santa-hat.glb>` from the repository root. The compiler validates both source hashes and bounded accessors without fetching or executing source content. It selects the verified head/hair color and spatial mask's largest connected component (46,669 triangles), preserves UV seams/source normals, simplifies with pinned meshoptimizer 0.25.0, and removes unused vertices. It discards all wizard costume geometry and metallic response.

Head positions become `X=(z-.12)*1.35+.10`, `Y=(y-1.645)*1.35+1.40`, `Z=-x*1.20`; normals use the corresponding inverse transpose. Head albedo is a single embedded 1024px WebP encoded with Next's existing Sharp; its default material uses zero metalness and roughness .9.

The cap includes source node translation `[-.03291893005371094,0,.000012703239917755127]`, rotates 180 degrees about Y, scales by 1.60 and translates by `[-.04,1.47,0]`. Position-rounded connectivity identifies exactly four source components: 2,336 textile triangles, 128 lining, 1,440 brim and 624 pompom. The unique component reaching source Y>.25 is the textile; the other three form the white surface. Component selection preserves source indices/UV seams before compaction. No donor cap PBR images are retained. At runtime the cap textile uses the same classic-red wool material/map as Santa's coat, and its white parts use the same fur material/map as the figure's trim.

Prepared `natural-santa-v2.glb`: 974,432 bytes, 24,527 triangles, 16,531 referenced vertices, three static named surfaces, one embedded head map, no skeleton or animation. Head: 19,999 triangles; cap textile: 2,336; cap fur/lining: 2,192. SHA-256: `01d8a110e06d6bec8a75262b13352556e38185b409df7567d9efe6484808eee1`.
