# Twin runner emission plan

## Geometry evidence

The existing `runnerRibbon` centerline begins at local `(-1.98, -0.29, 0)` in `santaSleighModel.ts`. Its two mesh placements are `(0, 0, -0.68)` and `(0, 0, 0.68)`. Therefore the emission origins are local `(-1.98, -0.29, -0.68)` and `(-1.98, -0.29, 0.68)` in the animated sleigh frame. The former `(-2, -0.15, 0)` center source is removed.

## Smallest complete change

1. Back up the current trail source/tests outside the repository and update existing task records before implementation.
2. Assign runner side using fixed particle birth parity, not its shifting buffer index. Keep the total birth cadence at 128 per second, split equally between the runners, with the same 192-particle buffer and one draw. Keep existing historical pose reconstruction; transform the correct runner origin by its birth-time sleigh pose and scale before applying existing drift/eddies.
3. Preserve all current brightness, pearl highlights, fading, lifetime, point sizes, scheduling, and disposal. Do not alter the sleigh geometry, model pose, routes, or renderer API.
4. Update focused attachment tests to cover consecutive births from both runners in both passes and viewport aspects. Verify the emitted positions against transformed actual rear-tip coordinates, and verify matching particles retain their runner identity as their buffer index changes. Preserve the current history/twinkle/eddy/lifecycle coverage.
5. Run focused trail and renderer tests, scoped lint/format and TypeScript. Existing unrelated TypeScript failures and full-lint generated-artifact failures remain out of scope.
6. Inspect actual near/distant desktop/mobile renders, including close crops of the rear runners. Record evidence and complete the existing task/report artifacts.

## Scope

Only trail source/tests and the trail specification/task/report artifacts. Continue in the current dirty checkout, preserve unrelated work, and do not commit or deploy.
