# Natural winter deer

The textured animal is adapted from Grab3D's White-Tailed Deer, dedicated by its publisher to the public domain under CC0 1.0. The original publisher dedication is preserved in [LICENSE.txt](LICENSE.txt).

- Publisher: https://grab3d.com/models/animals/deer/
- Original model: https://grab3d.com/dl/deer/deer-light.glb
- Original license: https://grab3d.com/dl/deer/LICENSE.txt
- Original SHA-256: `e1c790cf50f1cbad11fdf945e4a7e0d40580a35ef17e4644542a77449c745023`

Run `node scripts/prepare-natural-deer.cjs <local-original.glb>` from the repository root. The compiler validates the original file hash and bounded accessors, simplifies with pinned meshoptimizer 0.25.0, compacts vertices, bakes the canonical coordinates and eleven-bone limb/neck/head skin, resizes the coat to embedded WebP using Next's pinned Sharp, and places eight head-local rack attachment nodes. It does not fetch or execute model content.

Prepared `natural-deer-v2.glb`: 1,344,712 bytes, 19,999 triangles, 17,294 vertices, eleven bones, eight light attachments. SHA-256: `bad2a6573d20b274b66eec126ce07386a57167246124473f8f1370451ca13556`.
