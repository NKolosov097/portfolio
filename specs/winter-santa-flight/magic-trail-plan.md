# Santa magic trail implementation plan

## Scope and approach

Continue in the current checkout because the entire Santa feature and substantial related changes are uncommitted here. Preserve existing work. Use a small imperative Three Points effect in the existing Santa scene; CSS would not follow 3D perspective and another renderer would duplicate lifecycle work.

## Implementation

1. Create a bounded deterministic trail module in the SantaFlight folder. Use roughly 160-240 particles with a procedural shader for a soft halo and sparse four-point glints, additive blending, depthWrite false, and no external texture. Reuse geometry, typed buffers, vectors, and material. Name the object santa-magic-trail.
2. Sample particle birth times on a fixed temporal grid over approximately 1.5 seconds. Reconstruct historical sleigh positions from the existing routes and sampleSantaFormation using exactly the renderer's authored timing-to-arc-distance conversion. Keep sample time within the same visible pass/cycle; old positions do not move with today's sleigh. Add restrained deterministic spread, downward drift, and age-based opacity/size. This stateless approach supports direct preview seeking, resizing, and pause/resume without history-reset artifacts.
3. Share the minimal timing/pose calculation if needed rather than copy model animation. The real sleigh faces +X; rear local anchor is approximately (-2.0, -0.15, 0). Its normalization is team.spacing / 4; flight component scale is normalization * formation.scale. The sleigh frame is formation.frames[2]. Extract a small reusable sleigh pose helper from the existing animate code if needed to match its bob and rotations exactly. Do not reanimate the full model for every particle.
4. Integrate once into santaRenderer, outside pivot, update after team.animate, hide during still/hidden phases, and release resources in dispose and the partial-construction catch. Retain all existing scheduling and renderer semantics.
5. Add focused tests for deterministic seek, rear attachment, old world positions, direction changes, finite bounds, pass isolation, buffer reuse, and disposal. Extend existing renderer tests for scene integration and teardown as useful. Do not add artificial red-first steps.
6. Run scoped tests, TypeScript and lint, inspect desktop/mobile Near and Distant captures from the actual local preview. Adjust only trail appearance if necessary.

## Tasks and validation

Create tasks.md for this change before code. Record commands/results in magic-trail-validation.md. All authored files/comments in English, strict types, concise intent comment above functions, VoidFunction for void/no-arg callbacks. No commits, pushes, deployments, or unrelated formatting.
