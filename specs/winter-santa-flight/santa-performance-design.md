# Santa performance geometry evidence

## Inspected asset

The shipped `natural-santa-v2.glb` has three static meshes. The head contains 13,412 vertices and one shared face/hair/beard albedo. Numeric positions and sampled albedo colors were inspected together with the accepted close three-quarter render. Coordinates below are original Santa-local coordinates, before any new torso/head pivot offsets. The character faces +X; Y is vertical and Z is lateral.

## Restrained facial expression

Use a cheek-only relative morph target. Do not attempt a blink: the eyes are textured into the same surface, without separate eyelids or eyeballs. Do not lift the mouth corners: the observed region at Y 1.332, Z +/-0.043, X 0.155–0.180 mixes lip and white moustache vertices.

For each head vertex define `d=((Y-1.400)/0.021)^2+((abs(Z)-0.065)/0.024)^2`. The candidate mask `d<1 && X>0.120` selects 34 vertices on the negative-Z cheek and 37 on the positive-Z cheek. Every selected albedo sample is skin colored. Their measured Y range is approximately 1.3825–1.4167 and X range 0.1216–0.1606. This excludes painted eyes around Y 1.44, moustache around Y 1.37, nose center and long beard.

Use weight `max(0,1-d)^2 * smoothstep(0.115,0.125,X)`. The smooth X transition adds three negative-Z cheek vertices at X 0.1188–0.1192, also verified skin colored: the final nonzero mask contains 37 vertices per cheek. At full target strength displace `[0.001*w,0.004*w,sign(Z)*0.0005*w]`. This lifts and slightly rounds the cheeks without flattening the face. The weight has zero first derivative at the ellipse boundary. Position-identical UV seam vertices receive the same displacement. A normal runtime influence around `0.35+0.15*sin(0.7*t)` makes the expression warm and restrained; validate the entire 0–1 target range. Pair it with the specified independent head gaze/counterpitch. This is a subtle cheek expression, not an articulated smile or blink.

## Cap tip lag with fixed brim

The cloth surface is one connected component, 1,512 vertices, with bounds X [-0.252509,0.186556], Y [1.516238,1.905092], Z [-0.160532,0.160491]. The fur surface has three position-connected components:

| Part | Vertices | X bounds | Y bounds |
| --- | ---: | --- | --- |
| Inner lining | 140 | [-0.131330,0.156670] | [1.510846,1.526846] |
| Brim | 1,027 | [-0.188801,0.214934] | [1.470000,1.567693] |
| Pompom | 440 | [-0.294934,-0.190539] | [1.555073,1.652424] |

The safe asset-specific pompom discriminator is `X < -0.1895`; it separates all pompom vertices from every brim/lining vertex. Keep the latter exactly stationary relative to the head. A Y-only mask would wrongly move the brim and miss the hanging tip.

For cloth use weight `smoothstep(1.565,1.630,Y) * smoothstep(0.040,0.225,-X)`. Its attached lower crown stays fixed; the rear hanging tip reaches full weight. Inspection confirms every cloth vertex with X < -0.225 has Y >= 1.633474, so the cloth tip and pompom can share exactly the same full displacement. Give the pompom weight one, every other fur vertex zero.

A small relative target displacement `[0,0.020*w,0.016*w]`, driven by a delayed smooth harmonic of the torso motion, bends the trailing cloth and translates the entire pompom coherently. Use a signed influence if the implementation already supports symmetric motion and test both extrema. Do not scale the entire cap or rotate its brim independently from the head. Prepare target normals and conservative bounds once; avoid per-frame CPU vertex updates and geometry allocation.

## Tailored coat and sleeves

The existing coat loft uses nine sinusoidal lobes with ring-dependent phase; that regular rippling does not express a seated garment. Keep its silhouette and 26-ring/24-side topology, but replace only its fold field with two localized low-frequency fields: three broad lobes over the upper torso (Y 0.43–0.96, radial amplitude at most 0.010) and five softer folds over the lap below the belt (Y 0.08–0.30, amplitude at most 0.014). Use a smooth window that reaches zero at each region boundary. Keep Y 0.35 belt contact and collar/hem boundaries unchanged. A constant angular phase per region makes folds follow the garment instead of spiraling around each ring. Slightly vary the three-lobe field with height only inside its support, not at its boundaries.

Preserve the continuous sleeve sweep and tapered proportions. Concentrate sleeve folds around its elbow at approximately t 0.55–0.78; fade to zero at shoulder and cuff. Existing amplitude 0.045 of the sleeve radius is enough. Keep wrist morph influence zero at the shoulder and smooth toward one at the cuff, with cuff/glove/rein attachments following the same hand transform.

## Verification limits

The measurements establish safe candidate masks, not final visual acceptance. Inspect neutral and extreme expression/cap targets from front, profile and three-quarter views under actual scene lights; reject skin pinching, texture stretching, cap/pompom separation or collar gaps. Confirm no beard/eye/nose/brim vertices move under their excluded target. Preserve the public asset bytes, source compiler, ownership/disposal, accepted deer, routes and user development server. No product code or asset was modified during this investigation.
